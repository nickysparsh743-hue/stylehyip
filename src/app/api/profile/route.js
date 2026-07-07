import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function DELETE() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deleteProfile = await supabase.from('profiles').delete().eq('id', user.id);
    if (deleteProfile.error) {
        return NextResponse.json({ error: deleteProfile.error.message || 'Unable to delete profile data.' }, { status: 500 });
    }

    const adminClient = createSupabaseAdminClient();
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
        return NextResponse.json({ error: deleteUserError.message || 'Unable to delete user account.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
