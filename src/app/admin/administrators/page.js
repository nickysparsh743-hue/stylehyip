'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

export default function AdministratorsPage() {
    const { push } = useToast();
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        const response = await fetch('/api/admin/users?role=admin', { cache: 'no-store' });
        const data = await response.json();
        if (response.ok) setAdmins(data.users || []); else push(data.error || 'Unable to load administrators.', 'error');
        setLoading(false);
    }
    useEffect(() => { load(); }, []);

    async function changeRole(user) {
        const reason = window.prompt('Reason for removing administrator access');
        if (!reason) return;
        if (!window.confirm(`Remove administrator access from ${user.full_name || user.email}?`)) return;
        const response = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, action: 'role_customer', reason }) });
        const data = await response.json();
        if (!response.ok) { push(data.error || 'Unable to change role.', 'error'); return; }
        push('Administrator role changed.', 'success'); await load();
    }

    return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Administration</p><h1 className="mt-2 text-3xl font-semibold text-stone-900">Administrators</h1></div><button type="button" onClick={load} className="rounded-full border border-stone-300 px-4 py-2 text-sm">Refresh</button></div>{loading ? <p className="mt-8 text-stone-500">Loading administrators…</p> : <div className="mt-8 grid gap-4 md:grid-cols-2">{admins.map((admin) => <article key={admin.id} className="rounded-[1.5rem] border border-stone-200 bg-white p-5"><h2 className="font-semibold text-stone-900">{admin.full_name || 'Administrator'}</h2><p className="mt-1 text-sm text-stone-600">{admin.email}</p><p className="mt-1 text-xs text-stone-400">Registered {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : '—'}</p><button type="button" onClick={() => changeRole(admin)} className="mt-5 rounded-full border border-red-300 px-4 py-2 text-sm text-red-700">Remove administrator access</button></article>)}{!admins.length ? <p className="text-stone-500">No administrators found.</p> : null}</div>}</div>;
}
