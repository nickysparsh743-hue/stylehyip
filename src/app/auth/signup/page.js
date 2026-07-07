'use client';

import Link from 'next/link';

export default function SignupPage() {
    return (
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                <h1 className="text-3xl font-semibold text-stone-900">Access restricted</h1>
                <p className="mt-3 text-sm text-stone-600">Customer accounts are created by administrators and invitations are sent by email.</p>
                <div className="mt-8 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5 text-sm text-stone-700">
                    Please sign in with the email invitation sent to you by the store team.
                </div>
                <p className="mt-6 text-sm text-stone-600">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="font-semibold text-black hover:text-stone-700">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
