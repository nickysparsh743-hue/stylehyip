import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('orders')
        .select(
            `id,order_reference,status,payment_status,total,delivery_address,phone,customer_name,created_at,expires_at,cancellation_reason,paid_at,order_items(id,product_name,quantity,unit_price,subtotal,product:products(id,name,slug,image_url)),payments(id,status,payment_method,reference,mpesa_receipt_number,amount,created_at)`
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || 'Unable to fetch orders.' }, { status: 500 });
    }

    return NextResponse.json({ orders: data || [] });
}
