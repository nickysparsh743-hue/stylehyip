import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/services/customer-admin.service';

export async function GET(_request, { params }) {
    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await params;

    const { data: profile, error: profileError } = await auth.admin.from('profiles').select('*').eq('id', id).maybeSingle();
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
    if (!profile) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });

    const { data: authUser } = await auth.admin.auth.admin.getUserById(id);
    const [{ data: addresses }, { data: orders }, { data: customerRow }] = await Promise.all([
        auth.admin.from('addresses').select('*').eq('user_id', id).order('created_at', { ascending: false }),
        auth.admin.from('orders').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
        auth.admin.from('customers').select('*').limit(1),
    ]);

    const orderList = orders || [];
    const totalSpent = orderList.filter((order) => !['cancelled', 'pending'].includes(order.status)).reduce((sum, order) => sum + Number(order.total || 0), 0);
    const stats = {
        totalOrders: orderList.length,
        totalSpent,
        pendingOrders: orderList.filter((order) => ['pending', 'processing', 'paid', 'shipped'].includes(order.status)).length,
        completedOrders: orderList.filter((order) => order.status === 'delivered').length,
        cancelledOrders: orderList.filter((order) => order.status === 'cancelled').length,
    };

    return NextResponse.json({
        customer: { ...profile, email: authUser?.user?.email || '', last_login_at: authUser?.user?.last_sign_in_at || profile.last_login_at },
        addresses: addresses || [],
        stats,
        recentOrders: orderList,
    });
}
