import { NextResponse } from 'next/server';
import { createCategory, getCategories } from '@/lib/services/category.service';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
    const categories = await getCategories();
    return NextResponse.json(categories);
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
    const category = await createCategory(payload);
    return NextResponse.json(category);
}
