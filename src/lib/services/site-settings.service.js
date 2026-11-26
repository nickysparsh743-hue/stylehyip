import { createSupabaseServerClient } from '@/lib/supabase/server';

export const DEFAULT_SITE_SETTINGS = {
    general: {
        storeName: 'Step Into Style',
        tagline: 'Step Into Style, carry with confidence.',
        description: 'A premium Kenyan fashion store with M-Pesa and nationwide delivery.',
        storeLogo: '',
        favicon: '',
        websiteUrl: '',
        currency: 'KES',
        timeZone: 'Africa/Nairobi',
    },
    contact: {
        businessEmail: 'hello@stepintostyle.co.ke',
        supportEmail: 'hello@stepintostyle.co.ke',
        businessPhone: '+254 700 000 000',
        whatsappNumber: '25498260281',
        address: '',
        city: 'Nairobi',
        county: 'Nairobi',
        supportHours: 'Monday - Friday, 8am - 6pm',
    },
    social: {
        facebook: '', instagram: '', tiktok: '', twitter: '', youtube: '', linkedin: '',
    },
    homepage: {
        heroHeading: 'Step Into Style, carry with confidence.',
        heroDescription: 'Premium sneakers, handbags, and fashion essentials delivered across Kenya.',
        heroBackgroundImage: '',
        heroButtonText: 'Shop now',
        heroButtonLink: '/products',
        announcementText: '',
        promotionalBannerImage: '',
        featuredProductsVisible: true,
        featuredCategoriesVisible: true,
        newArrivalsVisible: true,
    },
    seo: {
        title: 'Step Into Style',
        description: 'A premium Kenyan fashion store with M-Pesa and nationwide delivery.',
        keywords: 'fashion, Kenya, M-Pesa, shopping, style',
        ogTitle: 'Step Into Style',
        ogDescription: 'Shop premium fashion in Kenya with secure M-Pesa checkout.',
        ogImage: '',
        author: 'Step Into Style',
        analyticsId: '',
        searchConsoleVerification: '',
    },
    legal: {
        privacyPolicy: '', termsAndConditions: '', returnPolicy: '', shippingPolicy: '', cancellationPolicy: '',
    },
};

function mergeSettings(value = {}) {
    const merged = structuredClone(DEFAULT_SITE_SETTINGS);
    for (const section of Object.keys(merged)) {
        if (value?.[section] && typeof value[section] === 'object') {
            merged[section] = { ...merged[section], ...value[section] };
        }
    }
    return merged;
}

export async function getPublicSiteSettings() {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from('site_configuration')
        .select('settings')
        .eq('id', 1)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }
    return mergeSettings(data?.settings);
}

export async function updateSiteSettingsSection(section, values) {
    if (!Object.hasOwn(DEFAULT_SITE_SETTINGS, section)) {
        throw new Error('Invalid settings section.');
    }

    const supabase = await createSupabaseServerClient();
    const { data: existing } = await supabase
        .from('site_configuration')
        .select('settings')
        .eq('id', 1)
        .maybeSingle();

    const current = mergeSettings(existing?.settings);
    const next = { ...current, [section]: { ...current[section], ...values } };
    const { data, error } = await supabase
        .from('site_configuration')
        .upsert({ id: 1, settings: next, updated_at: new Date().toISOString() }, { onConflict: 'id' })
        .select('settings')
        .single();

    if (error) {
        throw new Error(error.message);
    }
    return mergeSettings(data.settings);
}
