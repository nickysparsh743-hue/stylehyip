import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { normalizeEmail, validateEmail } from '@/lib/services/customer-admin.service';
import { notifyAllAdministrators } from '@/lib/services/notification.service';

export async function POST(request) {
    let payload;
    try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }

    const fullName = String(payload.fullName || '').trim();
    const email = normalizeEmail(payload.email);
    const phone = String(payload.phone || '').trim();
    const message = String(payload.message || '').trim();

    if (fullName.length < 2 || !validateEmail(email)) {
        return NextResponse.json({ error: 'Full name and a valid email address are required.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const [{ data: authUsers }, { data: pending }, { data: existingProfile }] = await Promise.all([
        admin.auth.admin.listUsers({ perPage: 1000 }),
        admin.from('customer_requests').select('id').eq('email', email).eq('status', 'pending').maybeSingle(),
        admin.from('profiles').select('id').limit(1),
    ]);

    if ((authUsers?.users || []).some((item) => item.email?.toLowerCase() === email)) {
        return NextResponse.json({ error: 'An account already exists for this email address.' }, { status: 409 });
    }
    if (pending) {
        return NextResponse.json({ error: 'A pending account request already exists for this email address.' }, { status: 409 });
    }

    const { data, error } = await admin
        .from('customer_requests')
        .insert({ full_name: fullName, email, phone, message, status: 'pending' })
        .select('*')
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify administrators about the new account request
    try {
        await notifyAllAdministrators({ title: 'New customer request', body: `${fullName} submitted an account request.`, type: 'customer_request', referenceId: data.id, referenceType: 'customer_request', eventKey: `customer_request:${data.id}` }).catch((notificationError) => console.error(notificationError));
    } catch (notificationError) {
        console.error('Error notifying administrators:', notificationError);
        // Handle notification error (e.g., log it, send a response, etc.)
    }

    return NextResponse.json({ success: true, request: data });
}
