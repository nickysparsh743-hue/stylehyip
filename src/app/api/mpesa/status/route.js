import { NextResponse } from 'next/server';
import { getPaymentStatus } from '@/lib/mpesa/status';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const paymentId = searchParams.get('paymentId');
        const orderId = searchParams.get('orderId');

        if (!paymentId && !orderId) {
            return NextResponse.json({ error: 'Payment ID or order ID is required.' }, { status: 400 });
        }

        if (paymentId && !/^[0-9a-fA-F-]{36}$/.test(paymentId)) {
            return NextResponse.json({ error: 'Payment ID must be a valid UUID.' }, { status: 400 });
        }

        const result = await getPaymentStatus({ paymentId, orderId });

        if (!result) {
            return NextResponse.json({ success: true, status: 'unknown', payment: null, order: null });
        }

        return NextResponse.json({
            success: true,
            paymentId: result.payment.id,
            orderId: result.payment.order_id,
            status: result.payment.status,
            amount: result.payment.amount,
            checkoutRequestId: result.payment.checkout_request_id,
            merchantRequestId: result.payment.merchant_request_id,
            orderStatus: result.order?.status || null,
            resultCode: result.payment.result_code,
            resultDescription: result.payment.result_description,
        });
    } catch (error) {
        console.error('Payment status lookup failed:', error);
        return NextResponse.json({ error: error.message || 'Unable to check payment status.' }, { status: 500 });
    }
}
