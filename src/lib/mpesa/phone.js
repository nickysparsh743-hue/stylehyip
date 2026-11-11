export function normalizeKenyanPhoneNumber(rawPhone) {
    if (!rawPhone || typeof rawPhone !== 'string') {
        throw new Error('A valid phone number is required.');
    }

    const cleaned = rawPhone.trim().replace(/\s+/g, '').replace(/[^\d+]/g, '');
    if (!cleaned) {
        throw new Error('A valid phone number is required.');
    }

    let normalized = cleaned;

    if (normalized.startsWith('+')) {
        normalized = normalized.slice(1);
    }

    if (normalized.startsWith('0')) {
        normalized = `254${normalized.slice(1)}`;
    }

    if (!normalized.startsWith('254')) {
        normalized = `254${normalized}`;
    }

    if (!/^(?:2547|2541)\d{8}$/.test(normalized)) {
        throw new Error('Enter a valid Kenyan M-Pesa phone number.');
    }

    return normalized;
}
