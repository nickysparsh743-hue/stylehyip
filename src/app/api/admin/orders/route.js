import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    if (profile?.role?.trim()?.toLowerCase() !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const { data: orders, error } = await admin
        .from('orders')
        .select(`*,order_items(id,product_name,quantity,unit_price,subtotal),payments(id,payment_method,payer_phone,phone_number,amount,status,mpesa_receipt_number,result_code,result_description,created_at,updated_at)`)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: 'Unable to load orders.' }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
}
