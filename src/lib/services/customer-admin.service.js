import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function requireAdmin() {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { error: 'Unauthorized', status: 401 };

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (profile?.role?.trim()?.toLowerCase() !== 'admin') return { error: 'Forbidden', status: 403 };
    if (profile.account_status && profile.account_status !== 'active') return { error: 'Administrator account is restricted', status: 403 };
    return { supabase, admin: createSupabaseAdminClient(), user, profile };
}

export async function logActivity(admin, { userId = null, action, reason = null, details = {} }) {
    const { error } = await admin
        .from('account_activity_logs')
        .insert({ user_id: userId, admin_id: admin.id, action, reason, details });
    if (error) throw error;
}

export function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

export function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}
