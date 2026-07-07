'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';

export default function OrdersPage() {
    const { user, loading } = useAuth();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadOrders() {
            if (!user?.id) {
                setOrders([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const response = await fetch('/api/orders');
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Unable to load orders.');
                }
                setOrders(data.orders || []);
            } catch (error) {
                console.error(error);
                setOrders([]);
            } finally {
                setIsLoading(false);
            }
        }

        loadOrders();
    }, [user?.id]);

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Your orders</p>
                <h1 className="mt-2 text-3xl font-semibold text-stone-900">Order history</h1>
                <p className="mt-3 text-stone-600">View your past orders and delivery statuses.</p>
                {loading || isLoading ? (
                    <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-6 text-sm text-stone-500">Loading orders…</div>
                ) : !user ? (
                    <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-6 text-sm text-stone-500">Sign in to view your orders.</div>
                ) : orders.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-6 text-sm text-stone-500">No orders found yet.</div>
                ) : (
                    <div className="mt-6 space-y-4">
                        {orders.map((order) => (
                            <div key={order.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-semibold text-stone-900">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                                        <p className="text-sm text-stone-500">{new Date(order.created_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                    </div>
                                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">{order.status}</span>
                                </div>
                                <div className="mt-4 grid gap-3 text-sm text-stone-600">
                                    <p><span className="font-semibold text-stone-800">Total:</span> KES {order.total?.toLocaleString('en-KE')}</p>
                                    <p><span className="font-semibold text-stone-800">Delivery:</span> {order.delivery_address}</p>
                                    <p><span className="font-semibold text-stone-800">Phone:</span> {order.phone}</p>
                                    {order.order_items?.map((item) => (
                                        <p key={item.id} className="text-stone-600">{item.quantity} × {item.product?.name || 'Item'} @ KES {item.unit_price?.toLocaleString('en-KE')}</p>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <Link href="/checkout" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">
                    Continue shopping
                </Link>
            </div>
        </div>
    );
}
