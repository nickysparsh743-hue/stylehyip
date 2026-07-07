import { NextResponse } from 'next/server';
import { createInvitedCustomer, getAdminUsers } from '@/lib/services/user.service';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const users = await getAdminUsers();
  return NextResponse.json({ users });
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
  const invitedUser = await createInvitedCustomer({
    email: payload.email,
    fullName: payload.fullName,
    phone: payload.phone,
    role: 'customer',
  });

  return NextResponse.json({ user: invitedUser.user });
}
