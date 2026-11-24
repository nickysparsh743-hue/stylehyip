import { randomUUID } from 'node:crypto';
import { createSupabaseServerClient } from '../supabase/server';
import { createSupabaseAdminClient } from '../supabase/admin';

export async function createOrder({
    userId = null,
    name,
    phone,
    address,
    items = [],
    notes = '',
    idempotencyKey = null,
}) {
    if (!items.length) {
        throw new Error('Order must contain at least one item.');
    }

    const supabase = createSupabaseAdminClient();

    if (idempotencyKey) {
        const { data: existingOrder, error: duplicateError } = await supabase
            .from('orders')
            .select('*')
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle();

        if (duplicateError) throw duplicateError;
        if (existingOrder) {
            return { order: existingOrder, total: existingOrder.total, duplicate: true };
        }
    }

    const productIds = [...new Set(items.map((item) => item.id).filter(Boolean))];
    if (!productIds.length) {
        throw new Error('Order items are missing product identifiers.');
    }

    const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, stock, is_active')
        .in('id', productIds);

    if (productsError) throw productsError;
    if (!products || products.length !== productIds.length) {
        throw new Error('One or more products could not be verified in the catalog.');
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    let total = 0;
    const orderItems = items.map((item) => {
        const product = productMap.get(item.id);
        if (!product || product.is_active === false) {
            throw new Error('A product in the cart is no longer available.');
        }

        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new Error('Each order item must have a valid quantity.');
        }
        if (quantity > Number(product.stock || 0)) {
            throw new Error(`${product.name} has insufficient stock.`);
        }

        const unitPrice = Number(product.price);
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            throw new Error(`The price for ${product.name} could not be verified.`);
        }

        const subtotal = unitPrice * quantity;
        total += subtotal;

        return {
            product_id: product.id,
            product_name: product.name,
            quantity,
            unit_price: unitPrice,
            subtotal,
        };
    });

    const orderReference = `SIS-${Date.now().toString().slice(-8)}-${randomUUID().slice(0, 4).toUpperCase()}`;

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: userId,
            order_reference: orderReference,
            customer_name: name,
            total,
            delivery_address: address,
            phone,
            notes,
            status: 'pending_payment',
            payment_status: 'unpaid',
            idempotency_key: idempotencyKey,
        })
        .select('*')
        .single();

    if (orderError || !order) {
        throw orderError || new Error('Unable to create order.');
    }

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems.map((item) => ({ order_id: order.id, ...item })));

    if (itemsError) {
        await supabase.from('orders').delete().eq('id', order.id);
        throw itemsError;
    }

    return { order, total, duplicate: false };
}

export async function getUserOrders(userId) {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('orders')
        .select(`id,order_reference,customer_name,status,payment_status,total,delivery_address,phone,notes,created_at,order_items(id,product_name,quantity,unit_price,subtotal,product:products(id,name,slug,image_url))`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}
