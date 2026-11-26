import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAccessibleOrder } from '@/lib/orders/access';
import { notifyAllAdministrators } from '@/lib/services/notification.service';

export async function GET(request, { params }) {
    try {
        const { orderId } = await params;
        const order = await getAccessibleOrder({ request, orderId });
        if (!order) {
            return NextResponse.json({ error: 'Order not found or access denied.' }, { status: 404 });
        }

        const supabase = createSupabaseAdminClient();
        const [{ data: items, error: itemsError }, { data: payments, error: paymentsError }, { data: activity, error: activityError }, { data: reviews }] = await Promise.all([
            supabase.from('order_items').select('id,product_id,product_name,quantity,unit_price,subtotal,product:products(id,name,slug,image_url)').eq('order_id', orderId).order('created_at'),
            supabase.from('payments').select('id,status,amount,payment_method,payer_phone,phone_number,reference,mpesa_receipt_number,result_code,result_description,checkout_request_id,merchant_request_id,transaction_date,created_at,updated_at').eq('order_id', orderId).order('created_at', { ascending: false }),
            supabase.from('order_activity').select('*').eq('order_id', orderId).eq('is_customer_visible', true).order('created_at', { ascending: true }),
            supabase.from('reviews').select('id,rating,comment,order_item_id,status,updated_at').eq('order_id', orderId),
        ]);

        if (itemsError) throw itemsError;
        if (paymentsError) throw paymentsError;
        if (activityError) throw activityError;

        return NextResponse.json({ success: true, order, items: items || [], payments: payments || [], activity: activity || [], reviews: reviews || [] });
    } catch (error) {
        console.error('Order details lookup failed:', error);
        return NextResponse.json({ error: 'Unable to load order details.' }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    const { orderId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await request.json().catch(() => ({}));
    const admin = createSupabaseAdminClient();
    const { data: order } = await admin.from('orders').select('id,user_id,status').eq('id', orderId).maybeSingle();
    if (!order || order.user_id !== user.id) return NextResponse.json({ error: 'Order not found or access denied.' }, { status: 404 });

    const { error } = await admin.rpc('cancel_customer_order', { p_order_id: orderId, p_user_id: user.id, p_reason: String(payload.reason || '').trim() || null });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ success: true });
}

export async function PATCH(request, { params }) {
    const { orderId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await request.json();
    const orderItemId = String(payload.orderItemId || '');
    const rating = Number(payload.rating);
    const comment = String(payload.comment || '').trim();
    if (!orderItemId || !Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: 'Order item and a valid rating are required.' }, { status: 400 });

    const admin = createSupabaseAdminClient();
    const { data: item } = await admin.from('order_items').select('id,product_id,order_id,orders(status,user_id)').eq('id', orderItemId).maybeSingle();
    if (!item || item.order_id !== orderId || item.orders?.user_id !== user.id || item.orders?.status !== 'delivered') return NextResponse.json({ error: 'You can only review delivered products from your own orders.' }, { status: 403 });

    const { data: existing } = await admin.from('reviews').select('id').eq('order_item_id', orderItemId).maybeSingle();
    if (existing && !payload.reviewId) return NextResponse.json({ error: 'You have already reviewed this product.' }, { status: 409 });

    const reviewPayload = { user_id: user.id, product_id: item.product_id, order_id: orderId, order_item_id: orderItemId, verified_purchase: true, rating, comment, status: 'approved', updated_at: new Date().toISOString() };
    const query = payload.reviewId
        ? admin.from('reviews').update(reviewPayload).eq('id', payload.reviewId).eq('user_id', user.id).select('*').single()
        : admin.from('reviews').insert(reviewPayload).select('*').single();
    const { data: review, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Notify administrators about a new or updated verified-purchase review
    await notifyAllAdministrators({
        title: 'New product review',
        body: `A verified-purchase review with ${rating} stars was submitted.`,
        type: 'new_review',
        referenceId: review.id,
        referenceType: 'review',
        eventKey: `new_review:${review.id}`,
    }).catch((notificationError) => console.error(notificationError));

    return NextResponse.json({ success: true, review });
}
