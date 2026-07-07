import { NextResponse } from 'next/server';
import { createProduct, getProducts } from '@/lib/services/product.service';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const featured = searchParams.get('featured') === 'true';

    const products = await getProducts({ search, categorySlug: category, featured, limit: 24 });
    return NextResponse.json(products);
}

export async function POST(request) {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile?.role || profile.role?.trim()?.toLowerCase?.() !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await request.json();
    const product = await createProduct(payload);
    return NextResponse.json(product);
}
