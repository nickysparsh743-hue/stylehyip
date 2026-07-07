import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createOrder } from '@/lib/services/order.service';

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

        const supabase = await createSupabaseServerClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        const { order, paymentReference, total } = await createOrder({
            userId: user?.id || null,
            name,
            phone,
            address,
            items,
            subtotal,
        });

        const paybill = process.env.NEXT_PUBLIC_MPESA_SHORTCODE || '123456';
        const account = process.env.NEXT_PUBLIC_MPESA_PASSKEY || 'STEPSTYLE';

        return NextResponse.json({
            success: true,
            orderId: order.id,
            paymentReference,
            paymentMethod: 'M-Pesa',
            total,
            instructions: [
                `Pay KES ${total.toLocaleString('en-KE')} to paybill ${paybill}`,
                `Use account number ${account}`,
                'Share the payment confirmation with our support team for order verification.',
            ],
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || 'Unable to create your order right now.' }, { status: 500 });
    }
}
