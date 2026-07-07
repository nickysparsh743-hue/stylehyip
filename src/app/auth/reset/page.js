'use client';

import Link from 'next/link';

export default function ResetPage() {
    return (
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                <h1 className="text-3xl font-semibold text-stone-900">Reset password</h1>
                <p className="mt-3 text-sm text-stone-600">Enter your email to receive password reset instructions.</p>
                <div className="mt-8 space-y-4">
                    <input type="email" placeholder="Email" className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" />
                    <button className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white">Send reset link</button>
                </div>
                <p className="mt-6 text-sm text-stone-600">
                    Remembered your password?{' '}
                    <Link href="/auth/login" className="font-semibold text-black hover:text-stone-700">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
}
