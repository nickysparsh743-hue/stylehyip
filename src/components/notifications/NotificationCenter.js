'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

function linkFor(notification, role) {
    if (notification.reference_type === 'order' && notification.reference_id) {
        return role === 'admin' ? '/admin/orders' : `/checkout/payment/${notification.reference_id}`;
    }
    if (notification.reference_type === 'product') return '/admin/inventory';
    if (notification.reference_type === 'customer_request') return '/admin/customer-requests';
    if (notification.reference_type === 'review') return '/admin';
    return '/notifications';
}

export default function NotificationCenter() {
    const { user, role } = useAuth();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const channelRef = useRef(null);
    const inFlightLoadRef = useRef(null);

    const load = useCallback(() => {
        if (!user) return Promise.resolve();
        if (inFlightLoadRef.current) return inFlightLoadRef.current;

        setLoading(true);
        const request = (async () => {
            try {
                const response = await fetch('/api/notifications?limit=8', { cache: 'no-store' });
                const data = await response.json();
                if (response.ok) { setItems(data.notifications || []); setUnreadCount(data.unreadCount || 0); }
            } finally {
                setLoading(false);
                inFlightLoadRef.current = null;
            }
        })();
        inFlightLoadRef.current = request;
        return request;
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const timer = window.setTimeout(() => void load(), 0);
        const supabase = createSupabaseBrowserClient();
        channelRef.current = supabase.channel(`notifications:${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => void load())
            .subscribe();
        return () => { window.clearTimeout(timer); if (channelRef.current) supabase.removeChannel(channelRef.current); };
    }, [user, load]);

    async function markRead(id) {
        await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read', id }) });
        await load();
    }

    async function markAll() {
        await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read_all' }) });
        await load();
    }

    if (!user) return null;

    return (
        <div className="relative">
            <button type="button" aria-label="Notifications" onClick={() => setOpen((value) => !value)} className="relative rounded-full border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">
                Bell
                {unreadCount > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
            </button>
            {open ? <div className="absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-[1.5rem] border border-stone-200 bg-white p-3 shadow-xl sm:w-96"><div className="flex items-center justify-between px-2 py-2"><h2 className="font-semibold text-stone-900">Notifications</h2><button type="button" onClick={markAll} className="text-xs font-semibold text-stone-600">Mark all read</button></div><div className="max-h-[420px] overflow-y-auto">{loading ? <p className="p-4 text-sm text-stone-500">Loading…</p> : items.length ? items.map((item) => <Link key={item.id} href={linkFor(item, role)} onClick={() => markRead(item.id)} className={`block rounded-xl border-b border-stone-100 p-3 ${item.is_read ? '' : 'bg-amber-50'}`}><p className="text-sm font-semibold text-stone-900">{item.title}</p><p className="mt-1 line-clamp-2 text-xs text-stone-600">{item.body}</p><p className="mt-2 text-[10px] text-stone-400">{new Date(item.created_at).toLocaleString()}</p></Link>) : <p className="p-6 text-center text-sm text-stone-500">No notifications.</p>}</div><Link href={role === 'admin' ? '/notifications' : '/notifications'} onClick={() => setOpen(false)} className="mt-2 block rounded-xl bg-stone-900 px-4 py-3 text-center text-xs font-semibold text-white">View all notifications</Link></div> : null}
        </div>
    );
}
