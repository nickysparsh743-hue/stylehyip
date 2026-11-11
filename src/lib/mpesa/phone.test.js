import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeKenyanPhoneNumber } from './phone.js';

test('normalizes valid Kenyan mobile numbers to E.164', () => {
    assert.equal(normalizeKenyanPhoneNumber('0712345678'), '254712345678');
    assert.equal(normalizeKenyanPhoneNumber('+254712345678'), '254712345678');
    assert.equal(normalizeKenyanPhoneNumber('254712345678'), '254712345678');
});

test('rejects invalid Kenyan phone numbers', () => {
    assert.throws(() => normalizeKenyanPhoneNumber('123'), /valid Kenyan M-Pesa phone number/);
    assert.throws(() => normalizeKenyanPhoneNumber('07123456'), /valid Kenyan M-Pesa phone number/);
});
