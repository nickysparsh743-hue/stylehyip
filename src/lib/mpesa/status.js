import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function getPaymentStatus({ paymentId, orderId }) {
    const supabase = createSupabaseAdminClient();

    let query = supabase.from('payments').select('*');

    if (paymentId) {
        query = query.eq('id', paymentId);
    } else if (orderId) {
        query = query.eq('order_id', orderId).order('created_at', { ascending: false }).limit(1);
    }

    const { data: payment, error } = await query.maybeSingle();
    if (error) {
        throw error;
    }

    if (!payment) {
        return null;
    }

    const { data: order } = await supabase
        .from('orders')
        .select('id, status, total')
        .eq('id', payment.order_id)
        .maybeSingle();

    return {
        payment,
        order,
    };
}
