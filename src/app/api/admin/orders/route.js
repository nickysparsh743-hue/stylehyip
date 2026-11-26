import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role?.trim()?.toLowerCase() !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: orders, error } = await admin
        .from('orders')
        .select(`*,order_items(id,product_name,quantity,unit_price,subtotal,product:products(id,name,slug,image_url)),payments(id,payment_method,payer_phone,phone_number,amount,status,reference,mpesa_receipt_number,checkout_request_id,merchant_request_id,transaction_date,result_code,result_description,created_at,updated_at),activity:order_activity(id,event_type,description,actor_type,actor_id,reference,details,created_at,is_customer_visible)`)
        .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: 'Unable to load orders.' }, { status: 500 });

    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.trim().toLowerCase() || '';
    const orderStatus = url.searchParams.get('orderStatus') || '';
    const paymentStatus = url.searchParams.get('paymentStatus') || '';
    const paymentMethod = url.searchParams.get('paymentMethod') || '';
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';

    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map((authUsers?.users || []).map((item) => [item.id, item.email || '']));

    let filtered = (orders || []).map((order) => ({ ...order, customer_email: emailMap.get(order.user_id) || '' }));
    if (search) filtered = filtered.filter((order) => [order.order_reference, order.customer_name, order.customer_email, order.phone].some((value) => String(value || '').toLowerCase().includes(search)));
    if (orderStatus) filtered = filtered.filter((order) => order.status === orderStatus);
    if (paymentStatus) filtered = filtered.filter((order) => order.payment_status === paymentStatus);
    if (paymentMethod) filtered = filtered.filter((order) => order.payments?.some((payment) => (payment.payment_method || '').toLowerCase() === paymentMethod.toLowerCase()));
    if (from) filtered = filtered.filter((order) => new Date(order.created_at) >= new Date(`${from}T00:00:00`));
    if (to) filtered = filtered.filter((order) => new Date(order.created_at) <= new Date(`${to}T23:59:59`));

    const all = orders || [];
    const stats = {
        total: all.length,
        pending: all.filter((order) => ['pending', 'pending_payment'].includes(order.status)).length,
        pendingPayments: all.filter((order) => ['unpaid', 'pending', 'failed'].includes(order.payment_status)).length,
        paid: all.filter((order) => order.payment_status === 'paid').length,
        processing: all.filter((order) => order.status === 'processing').length,
        shipped: all.filter((order) => order.status === 'shipped').length,
        delivered: all.filter((order) => order.status === 'delivered').length,
        cancelled: all.filter((order) => order.status === 'cancelled').length,
        failedPayments: all.filter((order) => order.payment_status === 'failed').length,
        refunded: all.filter((order) => order.payment_status === 'refunded').length,
    };

    return NextResponse.json({ orders: filtered, stats });
}

export async function PATCH(request) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role?.trim()?.toLowerCase() !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const payload = await request.json();
    const orderId = String(payload.orderId || '').trim();
    const action = String(payload.action || 'status').trim();
    if (!orderId) return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });

    const admin = createSupabaseAdminClient();

    if (action === 'manual_payment') {
        const amount = Number(payload.amount);
        const method = String(payload.paymentMethod || '').trim().toLowerCase();
        const reference = String(payload.reference || '').trim();
        const note = String(payload.note || '').trim();
        if (!['mpesa', 'cash', 'bank_transfer', 'bank'].includes(method)) return NextResponse.json({ error: 'Valid payment method is required.' }, { status: 400 });
        if (!Number.isInteger(amount) || amount <= 0) return NextResponse.json({ error: 'Amount received must be a positive integer.' }, { status: 400 });
        const { error } = await admin.rpc('confirm_manual_payment', { p_order_id: orderId, p_amount: amount, p_method: method, p_reference: reference || null, p_note: note || null, p_admin_id: user.id });
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true });
    }

    const status = String(payload.status || '').trim();
    if (!orderId || !['cancelled', 'processing', 'shipped', 'delivered', 'refunded'].includes(status)) {
        return NextResponse.json({ error: 'Valid order ID and status are required.' }, { status: 400 });
    }

    const { data: order } = await admin.from('orders').select('id,status').eq('id', orderId).maybeSingle();
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

    if (status === 'cancelled' && order.status !== 'cancelled') {
        const { error: inventoryError } = await admin.rpc('release_order_stock', { p_order_id: orderId, p_reason: 'Administrator cancelled order' });
        if (inventoryError) return NextResponse.json({ error: inventoryError.message }, { status: 500 });
    }

    if (status === 'refunded') {
        await admin.from('orders').update({ payment_status: 'refunded', refunded_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', orderId);
        await admin.from('payments').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('order_id', orderId);
    }

    await admin.rpc('log_order_activity', { p_order_id: orderId, p_event_type: `order_${status}`, p_description: `Administrator changed order status to ${status}`, p_actor_type: 'administrator', p_actor_id: user.id, p_reference: null, p_visible: true, p_details: '{}' });

    const { error } = await admin.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
