import { NextResponse } from 'next/server';
import { createProduct, deleteProduct, getProducts, updateProduct } from '@/lib/services/product.service';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function requireAdmin() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile?.role || profile.role?.trim()?.toLowerCase?.() !== 'admin') {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    return { supabase };
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const featured = searchParams.get('featured') === 'true';

    const products = await getProducts({ search, categorySlug: category, featured, limit: 24 });
    return NextResponse.json(products);
}

export async function POST(request) {
    const admin = await requireAdmin();
    if (admin.error) {
        return admin.error;
    }

    const payload = await request.json();
    const product = await createProduct(payload);
    return NextResponse.json(product);
}

export async function PUT(request) {
    const admin = await requireAdmin();
    if (admin.error) {
        return admin.error;
    }

    const payload = await request.json();
    const { id, ...updates } = payload;

    if (!id) {
        return NextResponse.json({ error: 'Product id is required.' }, { status: 400 });
    }

    const product = await updateProduct(id, updates);
    return NextResponse.json(product);
}

export async function DELETE(request) {
    const admin = await requireAdmin();
    if (admin.error) {
        return admin.error;
    }

    const payload = await request.json().catch(() => ({}));
    const productId = payload.id || new URL(request.url).searchParams.get('id');

    if (!productId) {
        return NextResponse.json({ error: 'Product id is required.' }, { status: 400 });
    }

    await deleteProduct(productId);
    return NextResponse.json({ success: true });
}
