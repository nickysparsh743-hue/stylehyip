import { NextResponse } from 'next/server';
import { requireAdmin, logActivity, normalizeEmail, validateEmail } from '@/lib/services/customer-admin.service';

export async function GET(request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const role = url.searchParams.get('role') || '';
  const status = url.searchParams.get('status') || '';
  const search = url.searchParams.get('search')?.trim().toLowerCase() || '';

  const [{ data: profiles, error }, { data: authUsers }] = await Promise.all([
    auth.admin.from('profiles').select('*').order('created_at', { ascending: false }),
    auth.admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const authMap = new Map((authUsers?.users || []).map((item) => [item.id, item]));
  let users = (profiles || []).map((profile) => {
    const authUser = authMap.get(profile.id);
    return {
      ...profile,
      email: authUser?.email || '',
      last_login_at: authUser?.last_sign_in_at || profile.last_login_at,
    };
  });

  if (role) users = users.filter((item) => item.role === role);
  if (status) users = users.filter((item) => (item.account_status || 'active') === status);
  if (search) users = users.filter((item) => [item.full_name, item.email, item.phone].some((value) => String(value || '').toLowerCase().includes(search)));

  return NextResponse.json({ users });
}

export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const payload = await request.json();
  const email = normalizeEmail(payload.email);
  const fullName = String(payload.fullName || '').trim();
  const phone = String(payload.phone || '').trim();
  const role = payload.role === 'admin' ? 'admin' : 'customer';

  if (!validateEmail(email) || !fullName) {
    return NextResponse.json({ error: 'A valid email and full name are required.' }, { status: 400 });
  }

  const { data: existingAuth } = await auth.admin.auth.admin.listUsers({ perPage: 1000 });
  if ((existingAuth?.users || []).some((item) => item.email?.toLowerCase() === email)) {
    return NextResponse.json({ error: 'An account already exists for this email.' }, { status: 409 });
  }

  const { data: pending } = await auth.admin.from('customer_invitations').select('id').eq('email', email).eq('status', 'pending').maybeSingle();
  if (pending) return NextResponse.json({ error: 'A pending invitation already exists for this email.' }, { status: 409 });

  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/signup`;
  const { data: invited, error: inviteError } = await auth.admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name: fullName, phone, role },
  });

  if (inviteError) return NextResponse.json({ error: inviteError.message || 'Unable to send invitation.' }, { status: 500 });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: invitation, error: insertError } = await auth.admin
    .from('customer_invitations')
    .insert({ email, full_name: fullName, phone, role, invited_by: auth.user.id, expires_at: expiresAt })
    .select('*')
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  await logActivity(auth.admin, { userId: invited?.user?.id || null, action: 'customer_invited', details: { email, role, invitationId: invitation.id } });

  return NextResponse.json({ invitation, user: invited?.user || null });
}

export async function PATCH(request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const payload = await request.json();
  const userId = String(payload.userId || '');
  const action = String(payload.action || '');
  if (!userId) return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });

  if (userId === auth.user.id && ['ban', 'delete', 'role_customer', 'role_admin'].includes(action)) {
    return NextResponse.json({ error: 'You cannot remove or restrict your own administrator access.' }, { status: 409 });
  }

  const { data: target } = await auth.admin.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (!target) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });

  if (action === 'block' || action === 'ban' || action === 'unblock' || action === 'restore' || action === 'delete' || action === 'role_customer' || action === 'role_admin') {
    if (action === 'block') {
      if (!String(payload.reason || '').trim()) return NextResponse.json({ error: 'A blocking reason is required.' }, { status: 400 });
      await auth.admin.from('profiles').update({ account_status: 'blocked', account_status_reason: payload.reason, account_status_until: payload.expiresAt || null, updated_at: new Date().toISOString() }).eq('id', userId);
      await auth.admin.auth.admin.updateUserById(userId, { ban_duration: payload.expiresAt ? `${Math.max(1, Math.ceil((new Date(payload.expiresAt).getTime() - Date.now()) / 3600000))}h` : '24h' });
      await logActivity(auth.admin, { userId, action: 'account_blocked', reason: payload.reason, details: { expiresAt: payload.expiresAt || null } });
    } else if (action === 'ban') {
      if (!String(payload.reason || '').trim()) return NextResponse.json({ error: 'A ban reason is required.' }, { status: 400 });
      await auth.admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
      await auth.admin.from('profiles').update({ account_status: 'banned', ban_reason: payload.reason, admin_note: payload.notes || null, updated_at: new Date().toISOString() }).eq('id', userId);
      await logActivity(auth.admin, { userId, action: 'account_banned', reason: payload.reason, details: { notes: payload.notes || null } });
    } else if (action === 'unblock' || action === 'restore') {
      await auth.admin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
      await auth.admin.from('profiles').update({ account_status: 'active', account_status_reason: null, account_status_until: null, ban_reason: null, admin_note: null, updated_at: new Date().toISOString() }).eq('id', userId);
      await logActivity(auth.admin, { userId, action: action === 'unblock' ? 'account_unblocked' : 'account_restored' });
    } else if (action === 'delete') {
      await auth.admin.from('profiles').update({ deleted_at: new Date().toISOString(), is_active: false, account_status: 'banned', updated_at: new Date().toISOString() }).eq('id', userId);
      const { error: authDeleteError } = await auth.admin.auth.admin.deleteUser(userId);
      if (authDeleteError) return NextResponse.json({ error: authDeleteError.message }, { status: 500 });
      await logActivity(auth.admin, { userId, action: 'account_deleted', reason: payload.reason || null });
    } else if (action === 'role_customer' || action === 'role_admin') {
      const role = action === 'role_admin' ? 'admin' : 'customer';
      await auth.admin.auth.admin.updateUserById(userId, { user_metadata: { ...(target.user_metadata || {}), role } });
      await auth.admin.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', userId);
      await logActivity(auth.admin, { userId, action: 'administrator_role_changed', reason: payload.reason || null, details: { role } });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid account action.' }, { status: 400 });
}
