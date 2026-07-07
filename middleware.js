import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const config = {
    matcher: ['/admin/:path*', '/profile', '/orders', '/api/admin/:path*'],
};

export async function middleware(request) {
    const pathname = request.nextUrl.pathname;
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value);
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
    const isProtectedRoute = pathname === '/profile' || pathname === '/orders' || isAdminRoute;
    const isAuthRoute = pathname.startsWith('/auth');

    if (isProtectedRoute && !isAuthRoute && (!user || error)) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isAdminRoute && user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (profile?.role !== 'admin') {
            if (pathname.startsWith('/api/')) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            return new NextResponse('Forbidden', { status: 403 });
        }
    }

    return response;
}
