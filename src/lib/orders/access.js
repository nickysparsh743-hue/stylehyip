import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function getAccessibleOrder({ request, orderId }) {
    if (!orderId) return null;

    const accessToken = request.cookies.get('stylehyip_order_access')?.value;
    const supabase = createSupabaseAdminClient();

    const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

    if (error) throw error;
    if (!order) return null;

    if (accessToken && order.access_token === accessToken) return order;

    if (order.user_id) {
        const { createSupabaseServerClient } = await import('@/lib/supabase/server');
        const serverSupabase = await createSupabaseServerClient();
        const { data: { user } } = await serverSupabase.auth.getUser();
        if (user?.id === order.user_id) return order;
    }

    return null;
}
