import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/services/customer-admin.service';

export async function GET(request) {
    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const url = new URL(request.url);
        const action = url.searchParams.get('action') || '';
        const adminId = url.searchParams.get('adminId') || '';
        let query = auth.admin
            .from('account_activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);
        if (action) query = query.eq('action', action);
        if (adminId) query = query.eq('admin_id', adminId);

        const { data: logs, error: logsError } = await query;
        if (logsError) {
            console.error('[GET /api/admin/activity] Failed to load account activity logs', {
                message: logsError.message,
                code: logsError.code,
                details: logsError.details,
                hint: logsError.hint,
            });
            return NextResponse.json(
                { error: 'Unable to load account activity logs.', code: logsError.code || 'ACTIVITY_QUERY_FAILED' },
                { status: 500 }
            );
        }

        const records = logs || [];
        const profileIds = [...new Set(records.flatMap((log) => [log.admin_id, log.user_id]).filter(Boolean))];

        let profiles = [];
        if (profileIds.length) {
            const { data: profileRows, error: profilesError } = await auth.admin
                .from('profiles')
                .select('id, full_name, phone, role, account_status, deleted_at')
                .in('id', profileIds);

            if (profilesError) {
                console.error('[GET /api/admin/activity] Failed to load related profiles', {
                    message: profilesError.message,
                    code: profilesError.code,
                    details: profilesError.details,
                    hint: profilesError.hint,
                });
            } else {
                profiles = profileRows || [];
            }
        }

        const { data: authData, error: authUsersError } = await auth.admin.auth.admin.listUsers({ perPage: 1000 });
        if (authUsersError) {
            console.error('[GET /api/admin/activity] Failed to load Supabase Auth users', {
                message: authUsersError.message,
                code: authUsersError.code,
                details: authUsersError.details,
            });
        }

        const authMap = new Map((authData?.users || []).map((authUser) => [authUser.id, authUser]));
        const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

        const enrich = (id) => {
            if (!id) return null;
            const profile = profileMap.get(id);
            const authUser = authMap.get(id);
            if (!profile && !authUser) return { id, full_name: null, email: null, deleted: true };

            return {
                id,
                full_name: profile?.full_name
                    || authUser?.user_metadata?.full_name
                    || authUser?.user_metadata?.name
                    || null,
                email: authUser?.email || null,
                phone: profile?.phone || authUser?.phone || null,
                role: profile?.role || authUser?.user_metadata?.role || null,
                account_status: profile?.account_status || null,
                deleted: Boolean(profile?.deleted_at) || !authUser,
            };
        };

        const enrichedLogs = records.map((log) => ({
            ...log,
            administrator: enrich(log.admin_id),
            user: enrich(log.user_id),
        }));

        return NextResponse.json({ logs: enrichedLogs });
    } catch (error) {
        console.error('[GET /api/admin/activity] Unexpected server error', error);
        return NextResponse.json(
            { error: 'An unexpected server error occurred while loading activity logs.' },
            { status: 500 }
        );
    }
}
