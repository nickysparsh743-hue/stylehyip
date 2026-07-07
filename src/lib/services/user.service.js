import { createSupabaseAdminClient } from '../supabase/admin';
import { createSupabaseServerClient } from '../supabase/server';

const normalizeRole = (value) => {
    if (!value || typeof value !== 'string') {
        return 'customer';
    }
    return value.trim().toLowerCase();
};

export async function createInvitedCustomer({ email, fullName, phone, role = 'customer' }) {
    const normalizedRole = normalizeRole(role);
    const adminClient = createSupabaseAdminClient();
    const tempPassword = `${Math.random().toString(36).slice(-10)}A1!`;

    const { data: createdUser, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { role: normalizedRole },
    });

    if (authError || !createdUser?.user) {
        throw authError || new Error('Unable to create user account.');
    }

    const supabase = await createSupabaseServerClient();
    const { error: profileError } = await supabase.from('profiles').upsert({
        id: createdUser.user.id,
        full_name: fullName,
        phone,
        role: normalizedRole,
        is_active: true,
        invited_at: new Date().toISOString(),
    });

    if (profileError) {
        throw profileError;
    }

    return {
        user: createdUser.user,
        temporaryPassword: tempPassword,
    };
}

export async function getAdminUsers() {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

    if (error) {
        throw error;
    }

    return data || [];
}
