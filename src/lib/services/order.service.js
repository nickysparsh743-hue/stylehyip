import { createSupabaseServerClient } from '../supabase/server';
import { createSupabaseAdminClient } from '../supabase/admin';

export async function createOrder({ userId = null, name, phone, address, items = [], subtotal, notes = '' }) {
    if (!items.length) {
        throw new Error('Order must contain at least one item.');
    }

    const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    const supabase = createSupabaseAdminClient();

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: userId,
            total,
            delivery_address: address,
            phone,
        })
        .select('*')
        .single();

    if (orderError || !order) {
        throw orderError || new Error('Unable to create order.');
    }

    const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) {
        throw itemsError;
    }

    const paymentReference = `MPESA-${Date.now().toString().slice(-6)}`;
    const { error: paymentError } = await supabase.from('payments').insert({
        order_id: order.id,
        provider: 'mpesa',
        status: 'pending',
        reference: paymentReference,
        amount: total,
    });

    if (paymentError) {
        throw paymentError;
    }

    return {
        order,
        paymentReference,
        total,
    };
}

export async function getUserOrders(userId) {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('orders')
        .select(
            `id,status,total,delivery_address,phone,created_at,order_items(id,quantity,unit_price,product:products(id,name,slug,image_url))`
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        throw error;
    }

    return data || [];
}
