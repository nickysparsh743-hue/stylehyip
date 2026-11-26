'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

export default function AccountActivityPage() {
    const { push } = useToast();
    const [logs, setLogs] = useState([]);
    const [action, setAction] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = action ? `?action=${encodeURIComponent(action)}` : '';
            const response = await fetch(`/api/admin/activity${params}`, { cache: 'no-store' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Unable to load logs.');
            setLogs(data.logs || []);
        } catch (error) {
            push(error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [action, push]);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    return (
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Administration</p>
                    <h1 className="mt-2 text-3xl font-semibold text-stone-900">Account Activity Logs</h1>
                </div>
                <button type="button" onClick={load} className="rounded-full border border-stone-300 px-4 py-2 text-sm">Refresh</button>
            </div>

            <div className="mt-8">
                <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Filter by action (for example account_blocked)" className="w-full max-w-md rounded-xl border border-stone-300 px-4 py-3 text-sm" />
            </div>

            {loading ? (
                <p className="mt-8 text-stone-500">Loading activity…</p>
            ) : (
                <div className="mt-6 space-y-3">
                    {logs.map((log) => {
                        const administratorName = log.administrator?.full_name || log.administrator?.email || 'Unknown administrator';
                        const userName = log.user?.full_name || log.user?.email || (log.user_id ? 'Deleted or unavailable account' : 'System');
                        return (
                            <article key={log.id} className="rounded-[1.25rem] border border-stone-200 bg-white p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-stone-900">{log.action.replaceAll('_', ' ')}</p>
                                        <p className="mt-1 text-sm text-stone-600">{log.reason || 'No reason provided'}</p>
                                    </div>
                                    <time className="text-xs text-stone-400">{new Date(log.created_at).toLocaleString()}</time>
                                </div>
                                <div className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
                                    <p>
                                        <span className="font-semibold text-stone-800">Administrator:</span>{' '}
                                        {administratorName}{log.administrator?.email && log.administrator.full_name ? ` · ${log.administrator.email}` : ''}
                                    </p>
                                    <p>
                                        <span className="font-semibold text-stone-800">Account:</span>{' '}
                                        {userName}{log.user?.email && log.user.full_name ? ` · ${log.user.email}` : ''}
                                    </p>
                                </div>
                                {Object.keys(log.details || {}).length ? (
                                    <pre className="mt-3 overflow-x-auto rounded-xl bg-stone-50 p-3 text-xs text-stone-600">{JSON.stringify(log.details, null, 2)}</pre>
                                ) : null}
                            </article>
                        );
                    })}
                    {!logs.length ? <p className="rounded-[1.25rem] border border-stone-200 p-8 text-center text-stone-500">No activity logs found.</p> : null}
                </div>
            )}
        </div>
    );
}
