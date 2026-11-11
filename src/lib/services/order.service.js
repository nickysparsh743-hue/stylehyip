import { createSupabaseServerClient } from '../supabase/server';
import { createSupabaseAdminClient } from '../supabase/admin';

export async function createOrder({ userId = null, name, phone, address, items = [], subtotal, notes = '' }) {
    if (!items.length) {
        throw new Error('Order must contain at least one item.');
    }

    const supabase = createSupabaseAdminClient();
    const productIds = [...new Set(items.map((item) => item.id).filter(Boolean))];

    if (!productIds.length) {
        throw new Error('Order items are missing product identifiers.');
    }

    const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, price, stock, is_active')
        .in('id', productIds);

    if (productsError) {
        throw productsError;
    }

    if (!products || products.length !== productIds.length) {
        throw new Error('One or more products could not be verified in the catalog.');
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    let total = 0;
    const orderItems = items.map((item) => {
        const product = productMap.get(item.id);
        if (!product) {
            throw new Error('A product in the cart could not be found.');
        }

        const quantity = Number(item.quantity || 0);
        if (quantity <= 0) {
            throw new Error('Each order item must have a quantity greater than zero.');
        }

        const unitPrice = Number(product.price || 0);
        total += unitPrice * quantity;

        return {
            product_id: item.id,
            quantity,
            unit_price: unitPrice,
        };
    });

    const clientTotal = Number(subtotal || 0);
    if (clientTotal > 0 && total !== clientTotal) {
        throw new Error('Order total validation failed. Please refresh and try again.');
    }

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: userId,
            total,
            delivery_address: address,
            phone,
            status: 'pending',
        })
        .select('*')
        .single();

    if (orderError || !order) {
        throw orderError || new Error('Unable to create order.');
    }

    const orderItemsToInsert = orderItems.map((item) => ({
        order_id: order.id,
        ...item,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
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
        phone_number: phone,
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
