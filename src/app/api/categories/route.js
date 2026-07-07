import { NextResponse } from 'next/server';
import { createCategory, deleteCategory, getCategories, updateCategory } from '@/lib/services/category.service';
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

export async function GET() {
    const categories = await getCategories();
    return NextResponse.json(categories);
}

export async function POST(request) {
    const admin = await requireAdmin();
    if (admin.error) {
        return admin.error;
    }

    const payload = await request.json();
    const category = await createCategory(payload);
    return NextResponse.json(category);
}

export async function PUT(request) {
    const admin = await requireAdmin();
    if (admin.error) {
        return admin.error;
    }

    const payload = await request.json();
    const { id, ...updates } = payload;

    if (!id) {
        return NextResponse.json({ error: 'Category id is required.' }, { status: 400 });
    }

    const category = await updateCategory(id, updates);
    return NextResponse.json(category);
}

export async function DELETE(request) {
    const admin = await requireAdmin();
    if (admin.error) {
        return admin.error;
    }

    const payload = await request.json().catch(() => ({}));
    const categoryId = payload.id || new URL(request.url).searchParams.get('id');

    if (!categoryId) {
        return NextResponse.json({ error: 'Category id is required.' }, { status: 400 });
    }

    try {
        await deleteCategory(categoryId);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message || 'Unable to delete category.' }, { status: error.code === '23503' || error.code === 'CATEGORY_HAS_PRODUCTS' ? 409 : 500 });
    }
}
