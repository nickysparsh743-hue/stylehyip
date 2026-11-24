export function getMpesaConfig() {
    const envName = (process.env.MPESA_ENV || 'sandbox').trim().toLowerCase();
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const businessShortCode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL || process.env.NEXT_PUBLIC_MPESA_CALLBACK_URL;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    if (!consumerKey) {
        throw new Error('MPESA_CONSUMER_KEY is missing.');
    }

    if (!consumerSecret) {
        throw new Error('MPESA_CONSUMER_SECRET is missing.');
    }

    if (!businessShortCode) {
        throw new Error('MPESA_SHORTCODE is missing.');
    }

    if (!passkey) {
        throw new Error('MPESA_PASSKEY is missing.');
    }

    const baseUrl = envName === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

    return {
        env: envName,
        baseUrl,
        callbackUrl: callbackUrl || `${siteUrl.replace(/\/$/, '')}/api/payments/mpesa/callback`,
        consumerKey,
        consumerSecret,
        businessShortCode,
        passkey,
    };
}
