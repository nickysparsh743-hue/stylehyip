import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createOrder } from '@/lib/services/order.service';
import { normalizeKenyanPhoneNumber } from '@/lib/mpesa/phone';
import { initiateMpesaStkPush } from '@/lib/mpesa/stkpush';

export async function POST(request) {
    try {
        const payload = await request.json();
        const subtotal = Number(payload.subtotal ?? 0);
        const phone = String(payload.phone ?? '').trim();
        const name = String(payload.name ?? '').trim();
        const address = String(payload.address ?? '').trim();
        const items = Array.isArray(payload.items) ? payload.items : [];

        if (!name || !phone || !address) {
            return NextResponse.json({ error: 'Please complete the required checkout fields.' }, { status: 400 });
        }

        if (!items.length) {
            return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
        }

        const normalizedPhone = normalizeKenyanPhoneNumber(phone);
        const supabase = await createSupabaseServerClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        const { order, paymentReference, total } = await createOrder({
            userId: user?.id || null,
            name,
            phone: normalizedPhone,
            address,
            items,
            subtotal,
        });

        const adminClient = createSupabaseAdminClient();
        const { data: paymentDetails, error: paymentLookupError } = await adminClient
            .from('payments')
            .select('*')
            .eq('order_id', order.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (paymentLookupError) {
            throw paymentLookupError;
        }

        if (!paymentDetails) {
            throw new Error('No payment record found for this order.');
        }

        if (paymentDetails.status === 'paid') {
            return NextResponse.json({
                success: false,
                error: 'This order has already been paid for.',
            }, { status: 409 });
        }

        if (paymentDetails.status === 'pending' && paymentDetails.checkout_request_id) {
            return NextResponse.json({
                success: false,
                error: 'A payment request is already in progress for this order.',
            }, { status: 409 });
        }

        let paymentResult;

        try {
            paymentResult = await initiateMpesaStkPush({
                orderId: order.id,
                amount: total,
                phoneNumber: normalizedPhone,
                accountReference: `ORDER-${String(order.id).slice(0, 8).toUpperCase()}`,
                transactionDesc: `Order ${String(order.id).slice(0, 8).toUpperCase()} payment`,
            });
        } catch (stkError) {
            await adminClient
                .from('payments')
                .update({
                    status: 'failed',
                    reference: paymentReference,
                    phone_number: normalizedPhone,
                    result_code: 'STK_INIT_FAILED',
                    result_description: stkError.message || 'Failed to initiate STK Push.',
                })
                .eq('id', paymentDetails.id);

            throw stkError;
        }

        const { error: paymentUpdateError } = await adminClient
            .from('payments')
            .update({
                status: 'pending',
                reference: paymentReference,
                checkout_request_id: paymentResult.checkoutRequestId,
                merchant_request_id: paymentResult.merchantRequestId,
                phone_number: normalizedPhone,
                result_code: paymentResult.responseCode,
                result_description: paymentResult.responseDescription,
            })
            .eq('id', paymentDetails.id);

        if (paymentUpdateError) {
            throw paymentUpdateError;
        }

        return NextResponse.json({
            success: true,
            orderId: order.id,
            paymentId: paymentDetails.id,
            paymentReference,
            paymentMethod: 'M-Pesa',
            checkoutRequestId: paymentResult.checkoutRequestId,
            merchantRequestId: paymentResult.merchantRequestId,
            total,
            status: 'pending',
            message: paymentResult.customerMessage,
        });
    } catch (error) {
        console.error('Checkout payment initiation failed:', error);
        return NextResponse.json({
            error: error.message || 'Unable to initiate M-Pesa payment right now.',
        }, { status: 500 });
    }
}
