import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile?.role || profile.role?.trim()?.toLowerCase?.() !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [{ count: products }, { count: orders }, { count: customers }, { data: revenueData }] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total').gte('status', 'paid'),
    ]);

    const revenue = revenueData?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;

    return NextResponse.json({
        products,
        orders,
        customers,
        revenue: `KES ${revenue.toLocaleString()}`,
    });
}
