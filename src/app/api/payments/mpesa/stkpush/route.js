import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAccessibleOrder } from '@/lib/orders/access';
import { normalizeKenyanPhoneNumber } from '@/lib/mpesa/phone';
import { initiateMpesaStkPush } from '@/lib/mpesa/stkpush';

export async function POST(request) {
    try {
        const payload = await request.json();
        const orderId = String(payload.orderId || '').trim();
        const payerPhone = normalizeKenyanPhoneNumber(String(payload.payerPhone || '').trim());
        const order = await getAccessibleOrder({ request, orderId });

        if (!order) {
            return NextResponse.json({ error: 'Order not found or access denied.' }, { status: 404 });
        }
        if (order.payment_status === 'paid') {
            return NextResponse.json({ error: 'This order has already been paid.' }, { status: 409 });
        }
        if (order.status === 'cancelled' || (order.expires_at && new Date(order.expires_at).getTime() <= Date.now())) {
            return NextResponse.json({ error: 'This order has expired or been cancelled. Please create a new order.' }, { status: 409 });
        }

        const supabase = createSupabaseAdminClient();
        const amount = Number(order.total);
        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ error: 'The order amount is invalid.' }, { status: 400 });
        }

        const reference = `MPESA-${randomUUID().slice(0, 8).toUpperCase()}`;
        const { data: attempt, error: attemptError } = await supabase
            .from('payments')
            .insert({
                order_id: order.id,
                provider: 'mpesa',
                payment_method: 'mpesa',
                status: 'pending',
                reference,
                amount,
                payer_phone: payerPhone,
                phone_number: payerPhone,
            })
            .select('*')
            .single();

        if (attemptError) throw attemptError;

        await supabase.from('orders').update({
            payment_status: 'pending',
            updated_at: new Date().toISOString(),
        }).eq('id', order.id);

        const { error: reserveError } = await supabase.rpc('reserve_order_stock', { p_order_id: order.id });
        if (reserveError) return NextResponse.json({ error: reserveError.message || 'Insufficient stock for this order.' }, { status: 409 });

        let paymentResult;
        try {
            paymentResult = await initiateMpesaStkPush({
                orderId: order.id,
                amount,
                phoneNumber: payerPhone,
                accountReference: order.order_reference || `ORDER-${order.id.slice(0, 8).toUpperCase()}`,
                transactionDesc: `Payment for ${order.order_reference || order.id.slice(0, 8)}`,
            });
        } catch (stkError) {
            await supabase.from('payments').update({
                status: 'failed',
                payer_phone: payerPhone,
                phone_number: payerPhone,
                result_code: 'STK_INIT_FAILED',
                result_description: stkError.message || 'Unable to initiate STK Push.',
                updated_at: new Date().toISOString(),
            }).eq('id', attempt.id);

            await supabase.from('orders').update({
                payment_status: 'failed',
                updated_at: new Date().toISOString(),
            }).eq('id', order.id);

            await supabase.rpc('release_order_stock', { p_order_id: order.id, p_reason: 'STK Push initiation failed; reservation released' });

            return NextResponse.json({
                success: false,
                paymentId: attempt.id,
                error: 'Safaricom could not start the payment request. Please retry.',
            }, { status: 502 });
        }

        const { error: updateError } = await supabase.from('payments').update({
            status: 'pending',
            checkout_request_id: paymentResult.checkoutRequestId,
            merchant_request_id: paymentResult.merchantRequestId,
            payer_phone: payerPhone,
            phone_number: payerPhone,
            result_code: paymentResult.responseCode,
            result_description: paymentResult.responseDescription,
            updated_at: new Date().toISOString(),
        }).eq('id', attempt.id);

        if (updateError) throw updateError;

        return NextResponse.json({
            success: true,
            paymentId: attempt.id,
            status: 'pending',
            checkoutRequestId: paymentResult.checkoutRequestId,
            message: paymentResult.customerMessage,
        });
    } catch (error) {
        console.error('M-Pesa payment initiation failed:', error);
        return NextResponse.json({
            error: error.message || 'Unable to start M-Pesa payment.',
        }, { status: 400 });
    }
}
