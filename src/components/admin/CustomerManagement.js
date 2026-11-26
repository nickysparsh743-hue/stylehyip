'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

const statusLabel = { active: 'Active', blocked: 'Blocked', banned: 'Banned', pending_verification: 'Pending verification' };

export default function CustomerManagement() {
    const { push } = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('');
    const [status, setStatus] = useState('');
    const [sortDesc, setSortDesc] = useState(true);
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);
    const [details, setDetails] = useState(null);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [invite, setInvite] = useState({ email: '', fullName: '', phone: '', role: 'customer' });
    const [submitting, setSubmitting] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (role) params.set('role', role); if (status) params.set('status', status); if (search) params.set('search', search);
            const response = await fetch(`/api/admin/users?${params}`, { cache: 'no-store' });
            const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load customers.');
            setUsers(data.users || []);
        } catch (error) { push(error.message, 'error'); } finally { setLoading(false); }
    }

    useEffect(() => { load(); }, [role, status]);

    async function openDetails(user) {
        setSelected(user); setDetails(null);
        const response = await fetch(`/api/admin/customers/${user.id}`, { cache: 'no-store' });
        const data = await response.json();
        if (response.ok) setDetails(data); else push(data.error || 'Unable to load account details.', 'error');
    }

    async function accountAction(action, extra = {}) {
        if (!selected) return;
        const response = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: selected.id, action, ...extra }) });
        const data = await response.json();
        if (!response.ok) { push(data.error || 'Unable to update account.', 'error'); return; }
        push('Account updated successfully.', 'success');
        await Promise.all([load(), openDetails(selected)]);
    }

    async function sendInvite(event) {
        event.preventDefault(); setSubmitting(true);
        try {
            const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invite) });
            const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to send invitation.');
            push('Customer invitation sent.', 'success'); setInviteOpen(false); setInvite({ email: '', fullName: '', phone: '', role: 'customer' }); await load();
        } catch (error) { push(error.message, 'error'); } finally { setSubmitting(false); }
    }

    const filtered = users.filter((user) => !search || [user.full_name, user.email, user.phone].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase())));
    const sorted = [...filtered].sort((a, b) => (sortDesc ? 1 : -1) * (new Date(a.created_at) - new Date(b.created_at)));
    const perPage = 10; const pages = Math.max(1, Math.ceil(sorted.length / perPage)); const visible = sorted.slice((page - 1) * perPage, page * perPage);

    return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Customer management</p><h1 className="mt-2 text-3xl font-semibold text-stone-900">Customers</h1></div><button type="button" onClick={() => setInviteOpen(true)} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">Invite customer</button></div>
        <div className="mt-8 rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm"><div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, email or phone" className="rounded-xl border border-stone-300 px-4 py-3 text-sm" /><select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-3 text-sm"><option value="">All roles</option><option value="customer">Customer</option><option value="admin">Administrator</option></select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-3 text-sm"><option value="">All statuses</option>{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><div className="flex gap-2"><button type="button" onClick={() => setSortDesc((value) => !value)} className="rounded-xl border border-stone-300 px-3 py-3 text-sm">{sortDesc ? 'Newest' : 'Oldest'}</button><button type="button" onClick={load} className="rounded-xl border border-stone-300 px-3 py-3 text-sm">Refresh</button></div></div></div>
        {loading ? <p className="mt-8 text-stone-500">Loading accounts…</p> : <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-stone-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wider text-stone-500"><tr><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Registered</th><th className="px-5 py-4">Last login</th></tr></thead><tbody>{visible.map((user) => <tr key={user.id} onClick={() => openDetails(user)} className="cursor-pointer border-b border-stone-100 hover:bg-stone-50"><td className="px-5 py-4"><p className="font-semibold text-stone-900">{user.full_name || 'Unnamed customer'}</p><p className="text-stone-500">{user.email}</p><p className="text-xs text-stone-400">{user.phone || 'No phone'}</p></td><td className="px-5 py-4"><span className="rounded-full bg-stone-100 px-3 py-1">{user.role}</span></td><td className="px-5 py-4"><span className="rounded-full bg-stone-100 px-3 py-1">{statusLabel[user.account_status || 'active'] || 'Active'}</span></td><td className="px-5 py-4 text-stone-600">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td><td className="px-5 py-4 text-stone-600">{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}</td></tr>)}</tbody></table>{!visible.length ? <p className="p-8 text-center text-stone-500">No customer accounts found.</p> : null}</div>}
        <div className="mt-4 flex items-center justify-between"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-full border border-stone-300 px-4 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-sm text-stone-500">Page {page} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-full border border-stone-300 px-4 py-2 text-sm disabled:opacity-40">Next</button></div>
        {selected ? <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Customer profile</p><h2 className="mt-2 text-2xl font-semibold text-stone-900">{selected.full_name || 'Account details'}</h2></div><button type="button" onClick={() => setSelected(null)} className="rounded-full border border-stone-300 px-3 py-2 text-sm">Close</button></div>{!details ? <p className="mt-8 text-stone-500">Loading details…</p> : <div className="mt-8 space-y-6"><section><h3 className="font-semibold text-stone-900">Personal information</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-stone-600"><div><dt>Email</dt><dd className="mt-1 font-medium text-stone-900">{details.customer.email || '—'}</dd></div><div><dt>Phone</dt><dd className="mt-1 font-medium text-stone-900">{details.customer.phone || '—'}</dd></div><div><dt>Created</dt><dd className="mt-1 font-medium text-stone-900">{new Date(details.customer.created_at).toLocaleString()}</dd></div><div><dt>Last login</dt><dd className="mt-1 font-medium text-stone-900">{details.customer.last_login_at ? new Date(details.customer.last_login_at).toLocaleString() : 'Never'}</dd></div></dl></section><section><h3 className="font-semibold text-stone-900">Delivery addresses</h3><div className="mt-3 space-y-2">{details.addresses.length ? details.addresses.map((address) => <p key={address.id} className="rounded-xl border border-stone-200 p-3 text-sm text-stone-600">{address.full_name} · {address.line1}, {address.city}, {address.county} · {address.phone}</p>) : <p className="text-sm text-stone-500">No saved addresses.</p>}</div></section><section><h3 className="font-semibold text-stone-900">Shopping summary</h3><div className="mt-3 grid grid-cols-2 gap-3">{Object.entries(details.stats).map(([key, value]) => <div key={key} className="rounded-xl border border-stone-200 p-3"><p className="text-xs text-stone-500">{key.replace(/([A-Z])/g, ' $1')}</p><p className="mt-1 font-semibold text-stone-900">{key === 'totalSpent' ? `KES ${Number(value).toLocaleString('en-KE')}` : value}</p></div>)}</div></section><section><h3 className="font-semibold text-stone-900">Recent orders</h3><div className="mt-3 space-y-2">{details.recentOrders.length ? details.recentOrders.map((order) => <p key={order.id} className="rounded-xl border border-stone-200 p-3 text-sm text-stone-600">{order.order_reference || order.id.slice(0, 8)} · {order.status} · KES {Number(order.total).toLocaleString('en-KE')}</p>) : <p className="text-sm text-stone-500">No order history.</p>}</div></section><section><h3 className="font-semibold text-stone-900">Account management</h3><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => { const reason = window.prompt('Blocking reason'); if (!reason) return; const expiresAt = window.prompt('Expiration date (YYYY-MM-DD), optional') || null; accountAction('block', { reason, expiresAt }); }} className="rounded-full border border-amber-300 px-4 py-2 text-sm">Block</button><button type="button" onClick={() => accountAction('unblock')} className="rounded-full border border-stone-300 px-4 py-2 text-sm">Unblock</button><button type="button" onClick={() => { const reason = window.prompt('Ban reason'); if (!reason) return; const notes = window.prompt('Administrative notes (optional)') || ''; accountAction('ban', { reason, notes }); }} className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700">Ban</button><button type="button" onClick={() => accountAction('restore')} className="rounded-full border border-stone-300 px-4 py-2 text-sm">Restore</button><button type="button" onClick={() => { if (!window.confirm('Permanently delete this account? Orders and payment history will be preserved.')) return; accountAction('delete', { reason: 'Deleted by administrator' }); }} className="rounded-full bg-red-700 px-4 py-2 text-sm text-white">Delete account</button></div></section></div>}</aside></div> : null}
        {inviteOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><form onSubmit={sendInvite} className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-xl"><div className="flex justify-between"><h2 className="text-xl font-semibold">Invite customer</h2><button type="button" onClick={() => setInviteOpen(false)}>Close</button></div><div className="mt-6 space-y-4"><input required type="email" placeholder="Email address" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} className="w-full rounded-xl border border-stone-300 px-4 py-3" /><input required placeholder="Full name" value={invite.fullName} onChange={(event) => setInvite({ ...invite, fullName: event.target.value })} className="w-full rounded-xl border border-stone-300 px-4 py-3" /><input placeholder="Phone number" value={invite.phone} onChange={(event) => setInvite({ ...invite, phone: event.target.value })} className="w-full rounded-xl border border-stone-300 px-4 py-3" /><select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value })} className="w-full rounded-xl border border-stone-300 px-4 py-3"><option value="customer">Customer</option><option value="admin">Administrator</option></select><button disabled={submitting} className="w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">{submitting ? 'Sending…' : 'Send invitation'}</button></div></form></div> : null}
    </div>;
}
