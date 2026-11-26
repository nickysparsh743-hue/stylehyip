import { NextResponse } from 'next/server';
import { requireAdmin, logActivity, normalizeEmail } from '@/lib/services/customer-admin.service';

export async function GET(request) {
    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || '';
    let query = auth.admin.from('customer_invitations').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const now = Date.now();
    return NextResponse.json({ invitations: (data || []).map((item) => ({ ...item, isExpired: item.status === 'pending' && new Date(item.expires_at).getTime() < now })) });
}

export async function PATCH(request) {
    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const payload = await request.json();
    const id = String(payload.id || '');
    const action = String(payload.action || '');
    if (!id) return NextResponse.json({ error: 'Invitation ID is required.' }, { status: 400 });

    const { data: invitation } = await auth.admin.from('customer_invitations').select('*').eq('id', id).maybeSingle();
    if (!invitation) return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });

    if (action === 'cancel') {
        await auth.admin.from('customer_invitations').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id);
        await logActivity(auth.admin, { action: 'invitation_cancelled', reason: payload.reason || null, details: { invitationId: id, email: invitation.email } });
        return NextResponse.json({ success: true });
    }

    if (action === 'resend') {
        const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/signup`;
        const { error } = await auth.admin.auth.admin.inviteUserByEmail(normalizeEmail(invitation.email), {
            redirectTo,
            data: { full_name: invitation.full_name, phone: invitation.phone, role: invitation.role },
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await auth.admin.from('customer_invitations').update({ status: 'pending', expires_at: expiresAt, updated_at: new Date().toISOString() }).eq('id', id);
        await logActivity(auth.admin, { action: 'invitation_resent', details: { invitationId: id, email: invitation.email } });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid invitation action.' }, { status: 400 });
}
