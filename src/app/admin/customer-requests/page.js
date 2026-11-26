'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

export default function CustomerRequestsPage() {
    const { push } = useToast();
    const [requests, setRequests] = useState([]);
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        try {
            const params = new URLSearchParams(); if (status) params.set('status', status); if (search) params.set('search', search);
            const response = await fetch(`/api/admin/customer-requests?${params}`, { cache: 'no-store' });
            const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load requests.'); setRequests(data.requests || []);
        } catch (error) { push(error.message, 'error'); } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, [status]);

    async function review(id, action) {
        let reason = '';
        if (action === 'declined') { reason = window.prompt('Decline reason (optional)') || ''; }
        const response = await fetch('/api/admin/customer-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, reason }) });
        const data = await response.json();
        if (!response.ok) { push(data.error || 'Unable to review request.', 'error'); return; }
        push(action === 'approved' ? 'Request approved and invitation sent.' : 'Request updated.', 'success'); await load();
    }

    return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Customer management</p><h1 className="mt-2 text-3xl font-semibold text-stone-900">Customer Requests</h1></div><div className="mt-8 grid gap-3 rounded-[1.5rem] border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_180px_auto]"><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && load()} placeholder="Search applicants" className="rounded-xl border border-stone-300 px-4 py-3 text-sm" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-3 text-sm"><option value="">All statuses</option>{['pending', 'approved', 'declined', 'cancelled'].map((item) => <option key={item} value={item}>{item}</option>)}</select><button type="button" onClick={load} className="rounded-xl border border-stone-300 px-4 py-3 text-sm">Refresh</button></div>{loading ? <p className="mt-8 text-stone-500">Loading requests…</p> : <div className="mt-6 space-y-4">{requests.map((request) => <article key={request.id} className="rounded-[1.5rem] border border-stone-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-stone-900">{request.full_name}</h2><p className="text-sm text-stone-600">{request.email} · {request.phone || 'No phone'}</p><p className="mt-1 text-xs text-stone-400">Submitted {new Date(request.created_at).toLocaleString()}</p>{request.message ? <p className="mt-3 max-w-2xl text-sm text-stone-600">{request.message}</p> : null}</div><span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{request.status}</span></div>{request.status === 'pending' ? <div className="mt-5 flex gap-2"><button type="button" onClick={() => review(request.id, 'approved')} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">Approve</button><button type="button" onClick={() => review(request.id, 'declined')} className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700">Decline</button></div> : null}</article>)}{!requests.length ? <p className="rounded-[1.5rem] border border-stone-200 p-8 text-center text-stone-500">No account requests found.</p> : null}</div>}</div>;
}
