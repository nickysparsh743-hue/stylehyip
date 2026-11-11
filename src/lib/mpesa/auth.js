import { getMpesaConfig } from './config';

const tokenCache = {
    accessToken: null,
    expiresAt: 0,
};

export async function getMpesaAccessToken() {
    const { consumerKey, consumerSecret, baseUrl } = getMpesaConfig();
    const now = Date.now();

    if (tokenCache.accessToken && tokenCache.expiresAt > now + 30000) {
        return tokenCache.accessToken;
    }

    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
        },
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.access_token) {
        throw new Error(payload?.errorMessage || 'Failed to generate Daraja access token.');
    }

    const expiresInSeconds = Number(payload.expires_in || 3600);
    tokenCache.accessToken = payload.access_token;
    tokenCache.expiresAt = Date.now() + (expiresInSeconds * 1000) - 30000;

    return tokenCache.accessToken;
}
