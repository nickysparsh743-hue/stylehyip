import { createSupabaseAdminClient } from '@/lib/supabase/admin';

function pickMetadataValue(items, key) {
    const item = Array.isArray(items)
        ? items.find((entry) => entry?.Name === key || entry?.name === key)
        : null;

    return item?.Value ?? item?.value ?? null;
}

function resolvePaymentStatus(resultCode) {
    const code = Number(resultCode ?? 1);
    if (code === 0) {
        return 'paid';
    }

    if (code === 1032) {
        return 'cancelled';
    }

    return 'failed';
}

export async function processMpesaCallback(payload) {
    const callback = payload?.Body?.stkCallback || payload?.stkCallback || payload;
    if (!callback || typeof callback !== 'object') {
        throw new Error('Invalid M-Pesa callback payload.');
    }

    const resultCode = callback.ResultCode ?? callback.resultCode ?? 0;
    const resultDesc = callback.ResultDesc ?? callback.resultDescription ?? 'M-Pesa callback received.';
    const checkoutRequestId = callback.CheckoutRequestID || callback.checkoutRequestId || null;
    const merchantRequestId = callback.MerchantRequestID || callback.merchantRequestId || null;

    if (!checkoutRequestId && !merchantRequestId) {
        throw new Error('Safaricom callback is missing request identifiers.');
    }

    const supabase = createSupabaseAdminClient();
    let paymentQuery = supabase.from('payments').select('*');

    if (checkoutRequestId && merchantRequestId) {
        paymentQuery = paymentQuery.or(`checkout_request_id.eq.${checkoutRequestId},merchant_request_id.eq.${merchantRequestId}`);
    } else if (checkoutRequestId) {
        paymentQuery = paymentQuery.eq('checkout_request_id', checkoutRequestId);
    } else {
        paymentQuery = paymentQuery.eq('merchant_request_id', merchantRequestId);
    }

    const { data: payment, error: paymentError } = await paymentQuery.maybeSingle();
    if (paymentError) {
        throw paymentError;
    }

    if (!payment) {
        return {
            acknowledged: false,
            reason: 'unknown_checkout_request_id',
            message: 'No payment record found for this Safaricom callback.',
        };
    }

    if (payment.status === 'paid') {
        return {
            acknowledged: true,
            duplicate: true,
            payment,
            status: 'paid',
        };
    }

    const itemList = callback.CallbackMetadata?.Item || [];
    const amount = pickMetadataValue(itemList, 'Amount');
    const mpesaReceiptNumber = pickMetadataValue(itemList, 'MpesaReceiptNumber');
    const phoneNumber = pickMetadataValue(itemList, 'PhoneNumber');
    const transactionDate = pickMetadataValue(itemList, 'TransactionDate');
    const nextStatus = resolvePaymentStatus(resultCode);
    const nextOrderStatus = nextStatus === 'paid' ? 'paid' : 'cancelled';

    const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update({
            status: nextStatus,
            merchant_request_id: merchantRequestId || payment.merchant_request_id,
            checkout_request_id: checkoutRequestId || payment.checkout_request_id,
            mpesa_receipt_number: mpesaReceiptNumber || payment.mpesa_receipt_number,
            phone_number: phoneNumber || payment.phone_number,
            transaction_date: transactionDate || payment.transaction_date,
            result_code: String(resultCode),
            result_description: resultDesc,
            amount: amount !== null && amount !== undefined ? Number(amount) : payment.amount,
        })
        .eq('id', payment.id)
        .select('*')
        .single();

    if (updateError) {
        throw updateError;
    }

    const { error: orderError } = await supabase
        .from('orders')
        .update({ status: nextOrderStatus })
        .eq('id', payment.order_id);

    if (orderError) {
        throw orderError;
    }

    return {
        acknowledged: true,
        payment: updatedPayment,
        status: nextStatus,
        orderStatus: nextOrderStatus,
    };
}
