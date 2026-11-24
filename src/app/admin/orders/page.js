'use client';

import { useEffect, useState } from 'react';

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadOrders() {
            try {
                const response = await fetch('/api/admin/orders', { cache: 'no-store' });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Unable to load orders.');
                setOrders(data.orders || []);
            } catch (loadError) {
                setError(loadError.message);
            }
        }
        loadOrders();
    }, []);

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-900">Orders</h1>
            {error ? <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : null}

            <div className="mt-8 space-y-5">
                {orders.map((order) => {
                    const latestPayment = order.payments?.[0];
                    return (
                        <article key={order.id} className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="font-semibold text-stone-900">{order.order_reference || order.id.slice(0, 8).toUpperCase()}</p>
                                    <p className="mt-1 text-sm text-stone-500">{new Date(order.created_at).toLocaleString('en-KE')}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">Order: {order.status}</span>
                                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Payment: {order.payment_status || 'unpaid'}</span>
                                </div>
                            </div>
                            <div className="mt-5 grid gap-4 text-sm text-stone-600 md:grid-cols-2">
                                <p><span className="font-semibold text-stone-900">Customer:</span> {order.customer_name}</p>
                                <p><span className="font-semibold text-stone-900">Contact phone:</span> {order.phone}</p>
                                <p><span className="font-semibold text-stone-900">Delivery:</span> {order.delivery_address}</p>
                                <p><span className="font-semibold text-stone-900">Amount:</span> KES {Number(order.total).toLocaleString('en-KE')}</p>
                                <p><span className="font-semibold text-stone-900">M-Pesa payer:</span> {latestPayment?.payer_phone || latestPayment?.phone_number || 'Not attempted'}</p>
                                <p><span className="font-semibold text-stone-900">Receipt:</span> {latestPayment?.mpesa_receipt_number || 'Pending'}</p>
                            </div>
                            {order.payments?.length ? (
                                <div className="mt-5 border-t border-stone-200 pt-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Payment attempts</p>
                                    <div className="mt-3 space-y-2">
                                        {order.payments.map((payment) => (
                                            <p key={payment.id} className="text-sm text-stone-600">
                                                {payment.status} · KES {Number(payment.amount).toLocaleString('en-KE')} · {payment.payer_phone || payment.phone_number || 'No payer'} · {payment.result_description || 'Awaiting result'}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </article>
                    );
                })}
            </div>
            {!orders.length && !error ? <p className="mt-8 text-stone-500">No orders found.</p> : null}
        </div>
    );
}
