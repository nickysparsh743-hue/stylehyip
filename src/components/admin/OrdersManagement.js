'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

export default function OrdersManagement() {
    const { push } = useToast();
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [orderStatus, setOrderStatus] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [sort, setSort] = useState('newest');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search); if (orderStatus) params.set('orderStatus', orderStatus); if (paymentStatus) params.set('paymentStatus', paymentStatus); if (paymentMethod) params.set('paymentMethod', paymentMethod); if (from) params.set('from', from); if (to) params.set('to', to);
            const response = await fetch(`/api/admin/orders?${params}`, { cache: 'no-store' });
            const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load orders.');
            setOrders(data.orders || []); setStats(data.stats || {});
        } catch (error) { push(error.message, 'error'); } finally { setLoading(false); }
    }, [search, orderStatus, paymentStatus, paymentMethod, from, to, push]);

    useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

    async function updateStatus(orderId, status) {
        if (!window.confirm(`Change this order to ${status}?`)) return;
        const response = await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, status }) });
        const data = await response.json(); if (!response.ok) { push(data.error || 'Unable to update order.', 'error'); return; }
        push('Order status updated.', 'success'); await load(); setSelected(null);
    }

    async function manualPayment(order) {
        const amount = window.prompt('Amount received', String(order.total)); if (!amount) return;
        const paymentMethod = window.prompt('Payment method (mpesa, cash, bank_transfer)', 'mpesa'); if (!paymentMethod) return;
        const reference = window.prompt('Transaction or receipt reference') || '';
        const note = window.prompt('Internal administrative note') || '';
        const response = await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id, action: 'manual_payment', amount: Number(amount), paymentMethod, reference, note }) });
        const data = await response.json(); if (!response.ok) { push(data.error || 'Unable to confirm payment.', 'error'); return; }
        push('Payment confirmed successfully.', 'success'); await load(); setSelected(null);
    }

    const sorted = useMemo(() => [...orders].sort((a, b) => {
        if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (sort === 'highest') return Number(b.total) - Number(a.total);
        if (sort === 'lowest') return Number(a.total) - Number(b.total);
        return new Date(b.created_at) - new Date(a.created_at);
    }), [orders, sort]);
    const perPage = 10;
    const pages = Math.max(1, Math.ceil(sorted.length / perPage));
    const visible = sorted.slice((page - 1) * perPage, page * perPage);

    const cards = [['Total', stats.total], ['Pending', stats.pending], ['Pending payments', stats.pendingPayments], ['Paid', stats.paid], ['Processing', stats.processing], ['Shipped', stats.shipped], ['Delivered', stats.delivered], ['Cancelled', stats.cancelled], ['Failed payments', stats.failedPayments], ['Refunded', stats.refunded]];

    return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Admin</p><h1 className="mt-2 text-3xl font-semibold text-stone-900">Orders</h1></div><button type="button" onClick={load} className="rounded-full border border-stone-300 px-4 py-2 text-sm">Refresh</button></div>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">{cards.map(([label, value]) => <div key={label} className="rounded-[1.25rem] border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500">{label}</p><p className="mt-2 text-2xl font-semibold text-stone-900">{value ?? 0}</p></div>)}</div>

        <div className="mt-8 grid gap-3 rounded-[1.5rem] border border-stone-200 bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
            <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && load()} placeholder="Search orders" className="rounded-xl border border-stone-300 px-3 py-3 text-sm" />
            <select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-3 text-sm"><option value="">All order statuses</option>{['pending_payment', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select>
            <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-3 text-sm"><option value="">All payment statuses</option>{['unpaid', 'pending', 'paid', 'failed', 'partially_paid', 'refunded'].map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-3 text-sm"><option value="">All methods</option><option value="mpesa">M-Pesa</option><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option></select>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-3 text-sm" /><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-3 text-sm" />
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-stone-300 px-3 py-3 text-sm md:col-start-1"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select>
            <button type="button" onClick={() => { setPage(1); load(); }} className="rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white">Apply filters</button>
        </div>

        {loading ? <p className="mt-8 text-stone-500">Loading orders…</p> : <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-stone-200 bg-white"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b bg-stone-50 text-xs uppercase text-stone-500"><tr><th className="px-5 py-4">Order</th><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Items</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Payment</th><th className="px-5 py-4">Actions</th></tr></thead><tbody>{visible.map((order) => { const latest = order.payments?.[0]; return <tr key={order.id} className="border-b border-stone-100"><td className="px-5 py-4"><p className="font-semibold text-stone-900">{order.order_reference}</p><p className="text-xs text-stone-400">{new Date(order.created_at).toLocaleString()}</p></td><td className="px-5 py-4"><p className="font-semibold">{order.customer_name}</p><p className="text-xs text-stone-500">{order.customer_email || '—'} · {order.phone}</p></td><td className="px-5 py-4">{order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0}</td><td className="px-5 py-4 font-semibold">KES {Number(order.total).toLocaleString('en-KE')}</td><td className="px-5 py-4"><span className="rounded-full bg-stone-100 px-3 py-1 text-xs">{order.status}</span></td><td className="px-5 py-4"><p>{order.payment_status}</p><p className="text-xs text-stone-500">{latest?.payment_method || 'Not set'}</p></td><td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setSelected(order)} className="rounded-full border border-stone-300 px-3 py-2 text-xs">Details</button>{order.payment_status !== 'paid' ? <button type="button" onClick={() => manualPayment(order)} className="rounded-full border border-emerald-300 px-3 py-2 text-xs text-emerald-700">Confirm payment</button> : null}</div></td></tr>; })}</tbody></table>{!visible.length ? <p className="p-8 text-center text-stone-500">No orders found.</p> : null}</div>}
        <div className="mt-4 flex justify-between"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-full border px-4 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-sm text-stone-500">Page {page} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-full border px-4 py-2 text-sm disabled:opacity-40">Next</button></div>

        {selected ? <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl sm:p-8"><div className="flex justify-between"><div><p className="text-xs uppercase text-stone-500">Order details</p><h2 className="mt-2 text-2xl font-semibold">{selected.order_reference}</h2></div><button type="button" onClick={() => setSelected(null)}>Close</button></div><div className="mt-6 space-y-6"><section><h3 className="font-semibold">Customer</h3><p className="mt-2 text-sm text-stone-600">{selected.customer_name}<br />{selected.customer_email || '—'} · {selected.phone}<br />{selected.delivery_address}</p></section><section><h3 className="font-semibold">Items</h3><div className="mt-3 space-y-2">{selected.order_items?.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border p-3 text-sm"><span>{item.quantity} × {item.product_name || item.product?.name}</span><span>KES {Number(item.subtotal || item.unit_price * item.quantity).toLocaleString('en-KE')}</span></div>)}</div><p className="mt-4 font-semibold">Total: KES {Number(selected.total).toLocaleString('en-KE')}</p></section><section><h3 className="font-semibold">Payments</h3><div className="mt-3 space-y-2">{selected.payments?.map((payment) => <div key={payment.id} className="rounded-xl border p-3 text-xs text-stone-600"><p>{payment.status} · {payment.payment_method} · KES {payment.amount}</p><p>Reference: {payment.reference || payment.mpesa_receipt_number || '—'}</p><p>Checkout: {payment.checkout_request_id || '—'}</p><p>Merchant: {payment.merchant_request_id || '—'}</p><p>{payment.result_description || ''}</p></div>)}</div></section><section><h3 className="font-semibold">Fulfillment status</h3><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => updateStatus(selected.id, 'processing')} className="rounded-full border px-3 py-2 text-xs">Processing</button><button type="button" onClick={() => updateStatus(selected.id, 'shipped')} className="rounded-full border px-3 py-2 text-xs">Shipped</button><button type="button" onClick={() => updateStatus(selected.id, 'delivered')} className="rounded-full border px-3 py-2 text-xs">Delivered</button><button type="button" onClick={() => updateStatus(selected.id, 'cancelled')} className="rounded-full border border-red-300 px-3 py-2 text-xs text-red-700">Cancel</button><button type="button" onClick={() => updateStatus(selected.id, 'refunded')} className="rounded-full border border-amber-300 px-3 py-2 text-xs text-amber-700">Refund</button></div></section></div></aside></div> : null}
    </div>;
}
