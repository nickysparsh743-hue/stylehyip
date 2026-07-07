'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';

const schema = z.object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signIn } = useAuth();
    const { push } = useToast();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({ resolver: zodResolver(schema) });

    const onSubmit = async (data) => {
        const result = await signIn(data);
        if (!result?.error) {
            const role = result?.profile?.role || result?.data?.user?.user_metadata?.role;
            const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : null;
            const requestedPath = searchParams.get('next') || '/';
            const redirectPath = normalizedRole === 'admin' ? '/admin' : requestedPath.startsWith('/admin') ? '/' : requestedPath;
            push('Signed in successfully.', 'success');
            router.replace(redirectPath);
            return;
        }
        push(result.error.message || 'Unable to sign in.', 'error');
    };

    return (
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                <h1 className="text-3xl font-semibold text-stone-900">Login</h1>
                <p className="mt-3 text-sm text-stone-600">Sign in with your email and password.</p>
                <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Email</label>
                        <input type="email" {...register('email')} className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none" />
                        {errors.email && <p className="mt-2 text-sm text-danger">{errors.email.message}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Password</label>
                        <input type="password" {...register('password')} className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none" />
                        {errors.password && <p className="mt-2 text-sm text-danger">{errors.password.message}</p>}
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60">
                        {isSubmitting ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
                <p className="mt-6 text-sm text-stone-600">
                    Need access?{' '}
                    <Link href="/auth/signup" className="font-semibold text-black hover:text-stone-700">
                        Contact the store team
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8"><div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm"><p className="text-sm text-stone-600">Loading…</p></div></div>}>
            <LoginForm />
        </Suspense>
    );
}
