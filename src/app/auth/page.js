import Link from 'next/link';

export default function AuthPage() {
    return (
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                <h1 className="text-3xl font-semibold text-stone-900">Account access</h1>
                <p className="mt-3 text-sm text-stone-600">Sign in or create a new account to manage orders and checkout faster.</p>
                <div className="mt-8 space-y-4">
                    <Link href="/auth/login" className="block rounded-full bg-black px-5 py-3 text-center text-sm font-semibold text-white">Login</Link>
                    <Link href="/auth/signup" className="block rounded-full border border-stone-300 px-5 py-3 text-center text-sm font-semibold text-stone-900">Create account</Link>
                    <Link href="/auth/reset" className="block text-center text-sm text-stone-600 underline-offset-4 hover:text-stone-900">Forgot password?</Link>
                </div>
            </div>
        </div>
    );
}
