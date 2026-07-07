import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function AdminGate({ children }) {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        redirect('/auth/login?next=/admin');
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role?.trim()?.toLowerCase?.() !== 'admin') {
        return (
            <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-20 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Access denied</p>
                <h1 className="mt-3 text-3xl font-semibold text-stone-900">403 Forbidden</h1>
                <p className="mt-4 max-w-lg text-stone-600">You do not have permission to view the admin dashboard.</p>
                <Link href="/" className="mt-8 rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">
                    Return home
                </Link>
            </div>
        );
    }

    return <>{children}</>;
}

export default function AdminLayout({ children }) {
    return <AdminGate>{children}</AdminGate>;
}
