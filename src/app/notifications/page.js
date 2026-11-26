'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/lib/context/AuthContext';

function linkFor(notification) {
    if (notification.reference_type === 'order' && notification.reference_id) {
        if (notification.reference_id) return `/checkout/payment/${notification.reference_id}`;
    }
    if (notification.reference_type === 'product') return '/admin/inventory';
    if (notification.reference_type === 'customer_request') return '/admin/customer-requests';
    return '/notifications';
}

export default function NotificationsPage() {
    const { user, role, loading: authLoading } = useAuth();
    const { push } = useToast();
    const [notifications, setNotifications] = useState([]); const [filter, setFilter] = useState('all'); const [type, setType] = useState(''); const [search, setSearch] = useState(''); const [loading, setLoading] = useState(true); const [offset, setOffset] = useState(0);
    const limit = 20;

    const load = useCallback(async () => { if (!user) return; setLoading(true); try { const params = new URLSearchParams({ limit: String(limit), offset: String(offset), filter, type, search }); const response = await fetch(`/api/notifications?${params}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load notifications.'); setNotifications(data.notifications || []); } catch (error) { push(error.message, 'error'); } finally { setLoading(false); } }, [user, offset, filter, type, search, push]);
    useEffect(() => { if (authLoading) return; if (!user) { setLoading(false); return; } const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [authLoading, user, load]);

    async function action(action, id) { try { const response = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to update notification.'); await load(); } catch (error) { push(error.message, 'error'); } }

    if (authLoading || loading && notifications.length === 0) return <div className="mx-auto max-w-5xl px-4 py-16 text-stone-600">Loading notifications…</div>;
    if (!user) return <div className="mx-auto max-w-5xl px-4 py-16"><h1 className="text-3xl font-semibold">Notifications</h1><p className="mt-3 text-stone-600">Sign in to view notifications.</p><Link href="/auth/login" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">Sign in</Link></div>;

    return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Account</p><h1 className="mt-2 text-3xl font-semibold text-stone-900">Notifications</h1></div><div className="flex gap-2"><button type="button" onClick={() => action('read_all')} className="rounded-full border border-stone-300 px-4 py-2 text-sm">Mark all read</button><button type="button" onClick={() => action('clear_read')} className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700">Clear read</button></div></div>
        <div className="mt-8 grid gap-3 rounded-[1.5rem] border border-stone-200 bg-white p-4 md:grid-cols-3"><select value={filter} onChange={(event) => { setFilter(event.target.value); setOffset(0); }} className="rounded-xl border border-stone-300 px-3 py-3 text-sm"><option value="all">All notifications</option><option value="unread">Unread</option><option value="read">Read</option></select><input value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0); }} placeholder="Search notifications" className="rounded-xl border border-stone-300 px-3 py-3 text-sm" /><input value={type} onChange={(event) => { setType(event.target.value); setOffset(0); }} placeholder="Category/type" className="rounded-xl border border-stone-300 px-3 py-3 text-sm" /></div>
        <div className="mt-6 space-y-3">{notifications.map((notification) => <article key={notification.id} className={`rounded-[1.25rem] border border-stone-200 p-5 ${notification.is_read ? 'bg-white' : 'bg-amber-50'}`}><div className="flex items-start justify-between gap-4"><Link href={linkFor(notification)} onClick={() => action('read', notification.id)} className="min-w-0 flex-1"><p className="font-semibold text-stone-900">{notification.title}</p><p className="mt-2 text-sm text-stone-600">{notification.body}</p><p className="mt-3 text-xs text-stone-400">{notification.type?.replaceAll('_', ' ') || 'Notification'} · {new Date(notification.created_at).toLocaleString()}</p></Link><button type="button" aria-label="Delete notification" onClick={() => action('delete', notification.id)} className="rounded-full border border-stone-300 px-3 py-2 text-xs">Delete</button></div></article>)}{!notifications.length ? <div className="rounded-[1.5rem] border border-stone-200 p-10 text-center text-stone-500">No notifications found.</div> : null}</div>
        <div className="mt-6 flex justify-between"><button type="button" disabled={offset === 0} onClick={() => setOffset((value) => Math.max(0, value - limit))} className="rounded-full border border-stone-300 px-4 py-2 text-sm disabled:opacity-40">Previous</button><button type="button" onClick={() => setOffset((value) => value + limit)} className="rounded-full border border-stone-300 px-4 py-2 text-sm">Next</button></div></div>;
}
