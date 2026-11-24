import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createOrder } from '@/lib/services/order.service';
import { normalizeKenyanPhoneNumber } from '@/lib/mpesa/phone';

export async function POST(request) {
    try {
        const payload = await request.json();
        const phone = String(payload.phone ?? '').trim();
        const name = String(payload.name ?? '').trim();
        const address = String(payload.address ?? '').trim();
        const notes = String(payload.notes ?? '').trim();
        const items = Array.isArray(payload.items) ? payload.items : [];

        if (!name || !phone || !address) {
            return NextResponse.json({ error: 'Please complete the required checkout fields.' }, { status: 400 });
        }
        if (!items.length) {
            return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
        }

        const normalizedPhone = normalizeKenyanPhoneNumber(phone);
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        const idempotencyKey = String(payload.idempotencyKey || '').trim() || null;
        const { order, total, duplicate } = await createOrder({
            userId: user?.id || null,
            name,
            phone: normalizedPhone,
            address,
            notes,
            items,
            idempotencyKey,
        });

        const response = NextResponse.json({
            success: true,
            duplicate,
            orderId: order.id,
            orderReference: order.order_reference,
            total,
            status: order.status,
            paymentStatus: order.payment_status,
        });

        response.cookies.set('stylehyip_order_access', order.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
        });

        return response;
    } catch (error) {
        console.error('Order creation failed:', error);
        return NextResponse.json({
            error: error.message || 'Unable to create your order right now.',
        }, { status: 500 });
    }
}
