import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const filter = url.searchParams.get('filter') || 'all';
    const type = url.searchParams.get('type') || '';
    const search = url.searchParams.get('search')?.trim().toLowerCase() || '';
    const limit = Math.min(Number(url.searchParams.get('limit') || 20), 100);
    const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);

    let query = createSupabaseAdminClient()
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

    if (filter === 'unread') query = query.eq('is_read', false);
    if (filter === 'read') query = query.eq('is_read', true);
    if (type) query = query.eq('type', type);
    if (search) query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);

    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const admin = createSupabaseAdminClient();
    const [{ count: unreadCount }, { count: totalCount }] = await Promise.all([
        admin.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false).gt('expires_at', new Date().toISOString()),
        admin.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gt('expires_at', new Date().toISOString()),
    ]);

    return NextResponse.json({ notifications: data || [], count: count || 0, unreadCount: unreadCount || 0, totalCount: totalCount || 0 });
}

export async function PATCH(request) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await request.json().catch(() => ({}));
    const action = String(payload.action || 'read');
    const admin = createSupabaseAdminClient();

    if (action === 'read') {
        const id = String(payload.id || '');
        if (!id) return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
        const { error } = await admin.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    }

    if (action === 'read_all') {
        const { error } = await admin.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
        const id = String(payload.id || '');
        if (!id) return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
        const { error } = await admin.from('notifications').delete().eq('id', id).eq('user_id', user.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    }

    if (action === 'clear_read') {
        const { error } = await admin.from('notifications').delete().eq('user_id', user.id).eq('is_read', true);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid notification action.' }, { status: 400 });
}
