import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ message: 'Auth route placeholder. Connect Supabase Auth or NextAuth for full authentication.' });
}
