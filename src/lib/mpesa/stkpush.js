import { getMpesaConfig } from './config';
import { normalizeKenyanPhoneNumber } from './phone';
import { getMpesaAccessToken } from './auth';

export function getMpesaTimestamp(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export function generateMpesaPassword(shortCode, passkey, timestamp) {
    return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
}

export async function initiateMpesaStkPush({
    orderId,
    amount,
    phoneNumber,
    accountReference,
    transactionDesc,
}) {
    if (!orderId) {
        throw new Error('Order ID is required for M-Pesa STK Push.');
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('Payment amount must be greater than zero.');
    }

    const config = getMpesaConfig();
    const normalizedPhone = normalizeKenyanPhoneNumber(phoneNumber);
    const timestamp = getMpesaTimestamp();
    const password = generateMpesaPassword(config.businessShortCode, config.passkey, timestamp);
    const token = await getMpesaAccessToken();
    const reference = accountReference || `ORDER-${String(orderId).slice(0, 8).toUpperCase()}`;
    const description = transactionDesc || `Order ${reference} payment`;

    const response = await fetch(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            BusinessShortCode: config.businessShortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(numericAmount),
            PartyA: normalizedPhone,
            PartyB: config.businessShortCode,
            PhoneNumber: normalizedPhone,
            CallBackURL: config.callbackUrl,
            AccountReference: reference,
            TransactionDesc: description,
        }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(payload?.errorMessage || 'Safaricom STK Push request failed.');
    }

    if (payload?.ResponseCode && payload.ResponseCode !== '0') {
        throw new Error(payload?.ResponseDescription || 'Safaricom rejected the STK Push request.');
    }

    return {
        merchantRequestId: payload?.MerchantRequestID || null,
        checkoutRequestId: payload?.CheckoutRequestID || null,
        responseCode: payload?.ResponseCode || '0',
        responseDescription: payload?.ResponseDescription || 'Success. Awaiting customer confirmation.',
        customerMessage: payload?.CustomerMessage || 'STK Push sent. Please check your phone.',
    };
}
