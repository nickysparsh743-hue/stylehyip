'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

export default function InvitationsPage() {
    const { push } = useToast();
    const [invitations, setInvitations] = useState([]);
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        try {
            const params = status ? `?status=${status}` : '';
            const response = await fetch(`/api/admin/invitations${params}`, { cache: 'no-store' });
            const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load invitations.'); setInvitations(data.invitations || []);
        } catch (error) { push(error.message, 'error'); } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, [status]);

    async function action(id, action) {
        const response = await fetch('/api/admin/invitations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
        const data = await response.json(); if (!response.ok) { push(data.error || 'Unable to update invitation.', 'error'); return; }
        push(action === 'resend' ? 'Invitation resent.' : 'Invitation cancelled.', 'success'); await load();
    }

    return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Customer management</p><h1 className="mt-2 text-3xl font-semibold text-stone-900">Invitations</h1></div><button type="button" onClick={load} className="rounded-full border border-stone-300 px-4 py-2 text-sm">Refresh</button></div><div className="mt-8"><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-3 text-sm"><option value="">All statuses</option>{['pending', 'accepted', 'cancelled', 'expired', 'failed'].map((item) => <option key={item} value={item}>{item}</option>)}</select></div>{loading ? <p className="mt-8 text-stone-500">Loading invitations…</p> : <div className="mt-6 space-y-4">{invitations.map((invitation) => <article key={invitation.id} className="rounded-[1.5rem] border border-stone-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-stone-900">{invitation.full_name || invitation.email}</h2><p className="text-sm text-stone-600">{invitation.email} · {invitation.phone || 'No phone'}</p><p className="mt-1 text-xs text-stone-400">Invited {new Date(invitation.created_at).toLocaleString()} · Expires {new Date(invitation.expires_at).toLocaleString()}</p></div><span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{invitation.isExpired ? 'expired' : invitation.status}</span></div>{invitation.status === 'pending' ? <div className="mt-5 flex gap-2"><button type="button" onClick={() => action(invitation.id, 'resend')} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">Resend</button><button type="button" onClick={() => action(invitation.id, 'cancel')} className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700">Cancel</button></div> : null}</article>)}{!invitations.length ? <p className="rounded-[1.5rem] border border-stone-200 p-8 text-center text-stone-500">No invitations found.</p> : null}</div>}</div>;
}
