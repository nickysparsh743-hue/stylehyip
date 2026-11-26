import { NextResponse } from 'next/server';
import { requireAdmin, logActivity, normalizeEmail } from '@/lib/services/customer-admin.service';

export async function GET(request) {
    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || '';
    const search = url.searchParams.get('search')?.trim().toLowerCase() || '';
    let query = auth.admin.from('customer_requests').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const requests = (data || []).filter((item) => !search || [item.full_name, item.email, item.phone].some((value) => String(value || '').toLowerCase().includes(search)));
    return NextResponse.json({ requests });
}

export async function PATCH(request) {
    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const payload = await request.json();
    const id = String(payload.id || '');
    const action = String(payload.action || '');
    if (!id) return NextResponse.json({ error: 'Request ID is required.' }, { status: 400 });

    const { data: customerRequest } = await auth.admin.from('customer_requests').select('*').eq('id', id).maybeSingle();
    if (!customerRequest) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    if (customerRequest.status !== 'pending') return NextResponse.json({ error: 'This request has already been reviewed.' }, { status: 409 });

    if (action === 'declined') {
        const { error } = await auth.admin.from('customer_requests').update({ status: 'declined', reviewed_by: auth.user.id, reviewed_at: new Date().toISOString(), admin_note: payload.reason || null, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await logActivity(auth.admin, { action: 'account_request_declined', reason: payload.reason || null, details: { requestId: id, email: customerRequest.email } });
        return NextResponse.json({ success: true });
    }

    if (action === 'cancelled') {
        await auth.admin.from('customer_requests').update({ status: 'cancelled', reviewed_by: auth.user.id, reviewed_at: new Date().toISOString(), admin_note: payload.reason || null, updated_at: new Date().toISOString() }).eq('id', id);
        await logActivity(auth.admin, { action: 'account_request_cancelled', reason: payload.reason || null, details: { requestId: id } });
        return NextResponse.json({ success: true });
    }

    if (action !== 'approved') return NextResponse.json({ error: 'Invalid review action.' }, { status: 400 });

    const email = normalizeEmail(customerRequest.email);
    const { data: authUsers } = await auth.admin.auth.admin.listUsers({ perPage: 1000 });
    if ((authUsers?.users || []).some((item) => item.email?.toLowerCase() === email)) {
        return NextResponse.json({ error: 'An account already exists for this applicant.' }, { status: 409 });
    }

    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/signup`;
    const { data: invited, error: inviteError } = await auth.admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name: customerRequest.full_name, phone: customerRequest.phone, role: 'customer' },
    });

    if (inviteError) {
        await auth.admin.from('customer_requests').update({ admin_note: `Approval attempted but invitation failed: ${inviteError.message}`, updated_at: new Date().toISOString() }).eq('id', id);
        return NextResponse.json({ error: inviteError.message, retryable: true }, { status: 502 });
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: invitationError } = await auth.admin.from('customer_invitations').insert({ email, full_name: customerRequest.full_name, phone: customerRequest.phone, role: 'customer', invited_by: auth.user.id, expires_at: expiresAt });
    if (invitationError) return NextResponse.json({ error: invitationError.message }, { status: 500 });

    const { error: updateError } = await auth.admin.from('customer_requests').update({ status: 'approved', reviewed_by: auth.user.id, reviewed_at: new Date().toISOString(), admin_note: payload.reason || null, updated_at: new Date().toISOString() }).eq('id', id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    await logActivity(auth.admin, { action: 'account_request_approved', details: { requestId: id, email, authUserId: invited?.user?.id || null } });
    return NextResponse.json({ success: true });
}
