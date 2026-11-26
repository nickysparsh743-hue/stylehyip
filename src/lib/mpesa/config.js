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

    const resolvedCallbackUrl = callbackUrl || `${siteUrl.replace(/\/$/, '')}/api/payments/mpesa/callback`;
    let callbackIsValid = false;
    try {
        const callback = new URL(resolvedCallbackUrl);
        callbackIsValid = callback.protocol === 'https:' || (envName !== 'production' && callback.protocol === 'http:');
    } catch {
        callbackIsValid = false;
    }
    if (!callbackIsValid) throw new Error('MPESA_CALLBACK_URL must be a valid public callback URL using HTTPS in production.');

    return {
        env: envName,
        baseUrl,
        callbackUrl: resolvedCallbackUrl,
        consumerKey,
        consumerSecret,
        businessShortCode,
        passkey,
    };
}
