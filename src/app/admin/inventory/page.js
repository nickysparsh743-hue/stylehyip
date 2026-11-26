/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

export default function InventoryPage() {
    const { push } = useToast();
    const [data, setData] = useState({ inventory: [], movements: [], stats: {} });
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [sort, setSort] = useState('name');
    const [page, setPage] = useState(1);
    const [form, setForm] = useState({ productId: '', operation: 'add', quantity: '', threshold: '', reason: '', referenceNumber: '' });
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/inventory', { cache: 'no-store' });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Unable to load inventory.');
            setData(payload);
        } catch (error) { push(error.message, 'error'); } finally { setLoading(false); }
    }, [push]);

    useEffect(() => {
        const timer = window.setTimeout(() => { void load(); }, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    async function submit(event) {
        event.preventDefault(); setSubmitting(true);
        try {
            const response = await fetch('/api/admin/inventory', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Unable to update inventory.');
            push('Inventory updated successfully.', 'success');
            setForm({ productId: '', operation: 'add', quantity: '', threshold: '', reason: '', referenceNumber: '' });
            await load();
        } catch (error) { push(error.message, 'error'); } finally { setSubmitting(false); }
    }

    const categories = useMemo(() => [...new Set(data.inventory.map((item) => item.categoryName))].sort(), [data.inventory]);
    const filtered = useMemo(() => data.inventory.filter((item) => {
        const matchesSearch = !search || [item.name, item.inventory?.sku].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()));
        const matchesCategory = !category || item.categoryName === category;
        const matchesStatus = !status || item.status === status;
        const tabStatus = tab === 'low' ? item.status === 'low' : tab === 'out' ? item.status === 'out' : true;
        return matchesSearch && matchesCategory && matchesStatus && tabStatus;
    }).sort((a, b) => {
        if (sort === 'quantity_desc') return b.stock - a.stock;
        if (sort === 'quantity_asc') return a.stock - b.stock;
        if (sort === 'updated') return new Date(b.inventory?.updated_at || 0) - new Date(a.inventory?.updated_at || 0);
        return a.name.localeCompare(b.name);
    }), [data.inventory, search, category, status, tab, sort]);

    const perPage = 10;
    const pages = Math.max(1, Math.ceil(filtered.length / perPage));
    const visible = filtered.slice((page - 1) * perPage, page * perPage);

    const badge = (status) => status === 'out' ? 'bg-red-100 text-red-700' : status === 'low' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700';
    const label = (status) => status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock';

    return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Store management</p><h1 className="mt-2 text-3xl font-semibold text-stone-900">Inventory</h1></div><button type="button" onClick={load} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold">Refresh</button></div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">{[
            ['Total products', data.stats.totalProducts ?? 0], ['Total units', data.stats.totalUnits ?? 0], ['Low stock', data.stats.lowStock ?? 0], ['Out of stock', data.stats.outOfStock ?? 0], ['Sufficient stock', data.stats.sufficientStock ?? 0]
        ].map(([title, value]) => <div key={title} className="rounded-[1.25rem] border border-stone-200 bg-white p-4 shadow-sm"><p className="text-xs text-stone-500">{title}</p><p className="mt-2 text-2xl font-semibold text-stone-900">{value}</p></div>)}</div>

        <nav className="mt-8 flex gap-2 overflow-x-auto" aria-label="Inventory sections">{[['overview', 'Overview'], ['all', 'All Stock'], ['low', 'Low Stock'], ['out', 'Out of Stock'], ['history', 'Inventory History']].map(([key, label]) => <button type="button" key={key} onClick={() => { setTab(key); setPage(1); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? 'bg-stone-900 text-white' : 'border border-stone-300 bg-white text-stone-700'}`}>{label}</button>)}</nav>

        {tab === 'overview' ? <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]"><div className="rounded-[1.5rem] border border-stone-200 bg-white p-6"><h2 className="font-semibold text-stone-900">Stock distribution</h2><div className="mt-5 space-y-4">{[['In stock', 'sufficientStock', 'bg-emerald-500'], ['Low stock', 'lowStock', 'bg-amber-400'], ['Out of stock', 'outOfStock', 'bg-red-500']].map(([label, key, color]) => { const value = data.stats[key] || 0; const total = data.stats.totalProducts || 1; return <div key={key}><div className="flex justify-between text-sm"><span>{label}</span><strong>{value}</strong></div><div className="mt-2 h-2 rounded-full bg-stone-100"><div className={`${color} h-2 rounded-full`} style={{ width: `${Math.max(value ? 4 : 0, (value / total) * 100)}%` }} /></div></div>; })}</div></div><div className="rounded-[1.5rem] border border-stone-200 bg-white p-6"><h2 className="font-semibold text-stone-900">Recent inventory activity</h2><div className="mt-4 space-y-3">{data.movements.slice(0, 8).map((movement) => <div key={movement.id} className="border-b border-stone-100 pb-3 text-sm"><p className="font-semibold text-stone-800">{movement.movement_type.replaceAll('_', ' ')}</p><p className="text-stone-500">{movement.quantity > 0 ? '+' : ''}{movement.quantity} units · {movement.reason || 'Inventory change'} · {new Date(movement.created_at).toLocaleString()}</p></div>)}</div></div></div> : null}

        {(tab === 'all' || tab === 'low' || tab === 'out') ? <><div className="mt-6 grid gap-3 rounded-[1.5rem] border border-stone-200 bg-white p-4 md:grid-cols-[1fr_180px_180px_180px]"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search product or SKU" className="rounded-xl border border-stone-300 px-4 py-3 text-sm" /><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-3 text-sm"><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-3 text-sm"><option value="">All statuses</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select><select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-3 text-sm"><option value="name">Product name</option><option value="quantity_desc">Quantity high-low</option><option value="quantity_asc">Quantity low-high</option><option value="updated">Last updated</option></select></div>{loading ? <p className="mt-8 text-stone-500">Loading inventory…</p> : <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-stone-200 bg-white"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wider text-stone-500"><tr><th className="px-5 py-4">Product</th><th className="px-5 py-4">SKU</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Stock</th><th className="px-5 py-4">Threshold</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Updated</th><th className="px-5 py-4">Action</th></tr></thead><tbody>{visible.map((item) => <tr key={item.id} className="border-b border-stone-100"><td className="px-5 py-4"><div className="flex items-center gap-3">{item.image_url ? <img src={item.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-stone-100" />}<strong className="text-stone-900">{item.name}</strong></div></td><td className="px-5 py-4 text-stone-600">{item.inventory?.sku || '—'}</td><td className="px-5 py-4 text-stone-600">{item.categoryName}</td><td className="px-5 py-4 font-semibold text-stone-900">{item.stock}</td><td className="px-5 py-4 text-stone-600">{item.threshold}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge(item.status)}`}>{label(item.status)}</span></td><td className="px-5 py-4 text-stone-500">{item.inventory?.updated_at ? new Date(item.inventory.updated_at).toLocaleString() : '—'}</td><td className="px-5 py-4"><button type="button" onClick={() => { setForm((current) => ({ ...current, productId: item.id })); document.getElementById('inventory-adjustment')?.scrollIntoView({ behavior: 'smooth' }); }} className="rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold">Adjust</button></td></tr>)}</tbody></table>{!visible.length ? <p className="p-8 text-center text-stone-500">No inventory records found.</p> : null}</div>}<div className="mt-4 flex items-center justify-between"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-full border px-4 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-sm text-stone-500">Page {page} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-full border px-4 py-2 text-sm disabled:opacity-40">Next</button></div></> : null}

        {tab === 'history' ? <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-stone-200 bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500"><tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Product</th><th className="px-5 py-4">Movement</th><th className="px-5 py-4">Change</th><th className="px-5 py-4">Previous</th><th className="px-5 py-4">New</th><th className="px-5 py-4">Reason / Reference</th></tr></thead><tbody>{data.movements.map((movement) => { const product = data.inventory.find((item) => item.id === movement.product_id); return <tr key={movement.id} className="border-b border-stone-100"><td className="px-5 py-4 text-stone-500">{new Date(movement.created_at).toLocaleString()}</td><td className="px-5 py-4 font-semibold">{product?.name || movement.product_id}</td><td className="px-5 py-4">{movement.movement_type.replaceAll('_', ' ')}</td><td className="px-5 py-4">{movement.quantity > 0 ? '+' : ''}{movement.quantity}</td><td className="px-5 py-4">{movement.previous_stock}</td><td className="px-5 py-4">{movement.new_stock}</td><td className="px-5 py-4 text-stone-600">{movement.reason || '—'}{movement.reference_number ? ` · ${movement.reference_number}` : ''}</td></tr>; })}</tbody></table>{!data.movements.length ? <p className="p-8 text-center text-stone-500">No inventory movements yet.</p> : null}</div> : null}

        <section id="inventory-adjustment" className="mt-8 rounded-[1.5rem] border border-stone-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold text-stone-900">Stock adjustment</h2><form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2"><select required value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} className="rounded-xl border border-stone-300 px-4 py-3 text-sm"><option value="">Select product</option>{data.inventory.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.stock} available)</option>)}</select><select value={form.operation} onChange={(event) => setForm({ ...form, operation: event.target.value })} className="rounded-xl border border-stone-300 px-4 py-3 text-sm"><option value="add">Add stock</option><option value="remove">Remove stock</option><option value="adjust">Adjust stock</option><option value="threshold">Update low-stock threshold</option></select>{form.operation === 'threshold' ? <input required type="number" min="0" placeholder="Low-stock threshold" value={form.threshold} onChange={(event) => setForm({ ...form, threshold: event.target.value })} className="rounded-xl border border-stone-300 px-4 py-3 text-sm" /> : <input required type="number" min="0" placeholder={form.operation === 'adjust' ? 'New stock quantity' : 'Quantity'} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="rounded-xl border border-stone-300 px-4 py-3 text-sm" />}<input placeholder="Optional reference number" value={form.referenceNumber} onChange={(event) => setForm({ ...form, referenceNumber: event.target.value })} className="rounded-xl border border-stone-300 px-4 py-3 text-sm" /><input required placeholder="Reason for adjustment" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} className="rounded-xl border border-stone-300 px-4 py-3 text-sm md:col-span-2" /><button disabled={submitting} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white md:col-span-2">{submitting ? 'Saving…' : 'Save inventory change'}</button></form></section>
    </div>;
}
