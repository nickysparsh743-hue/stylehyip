'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/ToastProvider';

export default function SignupPage() {
    const { push } = useToast();
    const [form, setForm] = useState({ fullName: '', email: '', phone: '', message: '' });
    const [submitting, setSubmitting] = useState(false);

    async function submit(event) {
        event.preventDefault();
        setSubmitting(true);
        try {
            const response = await fetch('/api/customer-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Unable to submit your request.');
            push('Your account request was submitted for review.', 'success');
            setForm({ fullName: '', email: '', phone: '', message: '' });
        } catch (error) {
            push(error.message, 'error');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Account request</p>
                <h1 className="mt-2 text-3xl font-semibold text-stone-900">Request an account</h1>
                <p className="mt-3 text-sm text-stone-600">Submit your details for administrator review. Approval will trigger a secure invitation email.</p>
                <form onSubmit={submit} className="mt-8 space-y-4">
                    <div><label className="mb-2 block text-sm font-semibold text-stone-800">Full name</label><input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-stone-800">Email</label><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-stone-800">Phone number</label><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-stone-800">Additional information</label><textarea rows={4} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" /></div>
                    <button type="submit" disabled={submitting} className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{submitting ? 'Submitting…' : 'Submit account request'}</button>
                </form>
                <p className="mt-6 text-sm text-stone-600">Already have an account? <Link href="/auth/login" className="font-semibold text-black">Sign in</Link></p>
            </div>
        </div>
    );
}
