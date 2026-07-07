import { NextResponse } from 'next/server';
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs';

export const config = {
    matcher: ['/admin/:path*', '/profile', '/orders'],
};

export async function middleware(request) {
    const response = NextResponse.next();
    const supabase = createMiddlewareSupabaseClient({ req: request, res: response });
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
    const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');

    if (isAdminRoute && (!session || !session.user)) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    if (!isAuthRoute && request.nextUrl.pathname.startsWith('/profile') && !session) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    return response;
}
