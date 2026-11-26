import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function createNotification({
    userId,
    title,
    body,
    type = 'account_update',
    referenceId = null,
    referenceType = null,
    eventKey = null,
    retentionDays = 30,
}) {
    if (!userId || !title) return null;
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc('create_notification', {
        p_user_id: userId,
        p_title: title,
        p_body: body,
        p_type: type,
        p_reference_id: referenceId,
        p_reference_type: referenceType,
        p_event_key: eventKey,
        p_retention_days: retentionDays,
    });
    if (error) throw error;
    return data;
}

export async function notifyAllAdministrators({ title, body, type, referenceId, referenceType, eventKey }) {
    const admin = createSupabaseAdminClient();
    const { data: administrators, error } = await admin
        .from('profiles')
        .select('id')
        .eq('role', 'admin');
    if (error) throw error;

    await Promise.all((administrators || []).map((administrator) =>
        createNotification({
            userId: administrator.id,
            title,
            body,
            type,
            referenceId,
            referenceType,
            eventKey: eventKey ? `${eventKey}:${administrator.id}` : null,
        })
    ).filter(Boolean));
}
