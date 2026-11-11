import { NextResponse } from 'next/server';
import { processMpesaCallback } from '@/lib/mpesa/callback';

export async function POST(request) {
    try {
        const payload = await request.json().catch(() => ({}));
        const result = await processMpesaCallback(payload);

        if (!result?.acknowledged) {
            return NextResponse.json(
                { ResultCode: 1, ResultDesc: result?.message || 'Unknown callback request.' },
                { status: 400 }
            );
        }

        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
        console.error('M-Pesa callback processing failed:', error);
        return NextResponse.json(
            { ResultCode: 1, ResultDesc: 'Callback processing failed.' },
            { status: 500 }
        );
    }
}
