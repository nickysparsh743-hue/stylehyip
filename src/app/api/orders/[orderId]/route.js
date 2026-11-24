import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAccessibleOrder } from '@/lib/orders/access';

export async function GET(request, { params }) {
    try {
        const { orderId } = await params;
        const order = await getAccessibleOrder({ request, orderId });
        if (!order) {
            return NextResponse.json({ error: 'Order not found or access denied.' }, { status: 404 });
        }

        const supabase = createSupabaseAdminClient();
        const [{ data: items, error: itemsError }, { data: payments, error: paymentsError }] = await Promise.all([
            supabase
                .from('order_items')
                .select('id,product_id,product_name,quantity,unit_price,subtotal')
                .eq('order_id', orderId)
                .order('created_at'),
            supabase
                .from('payments')
                .select('id,status,amount,payer_phone,phone_number,mpesa_receipt_number,result_code,result_description,checkout_request_id,created_at,updated_at')
                .eq('order_id', orderId)
                .order('created_at', { ascending: false }),
        ]);

        if (itemsError) throw itemsError;
        if (paymentsError) throw paymentsError;

        return NextResponse.json({
            success: true,
            order,
            items: items || [],
            payments: payments || [],
        });
    } catch (error) {
        console.error('Order details lookup failed:', error);
        return NextResponse.json({ error: 'Unable to load order details.' }, { status: 500 });
    }
}
