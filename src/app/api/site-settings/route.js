import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getPublicSiteSettings, updateSiteSettingsSection } from '@/lib/services/site-settings.service';

export async function GET() {
    try {
        const settings = await getPublicSiteSettings();
        return NextResponse.json({ settings });
    } catch (error) {
        return NextResponse.json({ error: error.message || 'Unable to load settings.' }, { status: 500 });
    }
}

export async function PUT(request) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    if (profile?.role?.trim()?.toLowerCase() !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const payload = await request.json();
        if (!payload?.section || !payload?.values || typeof payload.values !== 'object') {
            return NextResponse.json({ error: 'A settings section and values are required.' }, { status: 400 });
        }

        const settings = await updateSiteSettingsSection(payload.section, payload.values);
        return NextResponse.json({ settings });
    } catch (error) {
        const status = error.message?.startsWith('Invalid settings') ? 400 : 500;
        return NextResponse.json({ error: error.message || 'Unable to save settings.' }, { status });
    }
}
