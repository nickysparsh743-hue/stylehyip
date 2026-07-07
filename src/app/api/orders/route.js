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
            `id,status,total,delivery_address,phone,created_at,order_items(id,quantity,unit_price,product:products(id,name,slug,image_url))`
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || 'Unable to fetch orders.' }, { status: 500 });
    }

    return NextResponse.json({ orders: data || [] });
}
