import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/services/customer-admin.service';

export async function GET(request) {
    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const [{ data: products, error: productsError }, { data: movements, error: movementsError }] = await Promise.all([
        auth.admin.from('products').select('id,name,slug,image_url,category_id,stock,is_active,categories(name),inventory(stock,low_stock_threshold,sku,updated_at)').order('name'),
        auth.admin.from('inventory_movements').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    if (productsError) return NextResponse.json({ error: productsError.message }, { status: 500 });
    if (movementsError) return NextResponse.json({ error: movementsError.message }, { status: 500 });

    const rows = (products || []).map((product) => {
        const inventory = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
        const stock = Number(inventory?.stock ?? product.stock ?? 0);
        const threshold = Number(inventory?.low_stock_threshold ?? 5);
        const status = stock <= 0 ? 'out' : stock <= threshold ? 'low' : 'in';
        return { ...product, inventory: inventory || { stock, low_stock_threshold: threshold, sku: product.sku || '', updated_at: null }, stock, threshold, status, categoryName: product.categories?.name || 'Uncategorized' };
    });

    const stats = {
        totalProducts: rows.length,
        totalUnits: rows.reduce((sum, row) => sum + row.stock, 0),
        lowStock: rows.filter((row) => row.status === 'low').length,
        outOfStock: rows.filter((row) => row.status === 'out').length,
        sufficientStock: rows.filter((row) => row.status === 'in').length,
    };

    return NextResponse.json({ inventory: rows, movements: movements || [], stats });
}

export async function PATCH(request) {
    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const payload = await request.json();
    const productId = String(payload.productId || '');
    const operation = String(payload.operation || '');
    const reason = String(payload.reason || '').trim();
    const reference = String(payload.referenceNumber || '').trim() || null;

    if (!productId || !reason) return NextResponse.json({ error: 'Product and reason are required.' }, { status: 400 });

    if (operation === 'threshold') {
        const threshold = Number(payload.threshold);
        if (!Number.isInteger(threshold) || threshold < 0) return NextResponse.json({ error: 'Threshold must be a non-negative integer.' }, { status: 400 });
        const { data, error } = await auth.admin.rpc('update_inventory_threshold', { p_product_id: productId, p_threshold: threshold, p_reason: reason, p_performed_by: auth.user.id });
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true, threshold: data });
    }

    if (!['add', 'remove', 'adjust'].includes(operation)) return NextResponse.json({ error: 'Invalid inventory operation.' }, { status: 400 });
    const quantity = Number(payload.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) return NextResponse.json({ error: 'Quantity must be a non-negative integer.' }, { status: 400 });

    const { data, error } = await auth.admin.rpc('manual_inventory_adjust', {
        p_product_id: productId,
        p_operation: operation,
        p_quantity: quantity,
        p_reason: reason,
        p_reference: reference,
        p_performed_by: auth.user.id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, stock: data });
}
