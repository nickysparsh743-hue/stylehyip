'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/store-data';

export default function PaymentPage() {
    const { orderId } = useParams();
    const router = useRouter();
    const [order, setOrder] = useState(null);
    const [items, setItems] = useState([]);
    const [payments, setPayments] = useState([]);
    const [payerPhone, setPayerPhone] = useState('');
    const [paymentId, setPaymentId] = useState(null);
    const [status, setStatus] = useState('idle');
    const [mpesaReceipt, setMpesaReceipt] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!orderId) return;
        let active = true;

        async function loadOrder() {
            try {
                const response = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Unable to load your order.');
                if (!active) return;
                setOrder(data.order);
                setItems(data.items);
                setPayments(data.payments);
            } catch (loadError) {
                if (active) setError(loadError.message);
            }
        }

        loadOrder();
        return () => { active = false; };
    }, [orderId]);

    useEffect(() => {
        if (!paymentId || status !== 'pending') return undefined;

        let active = true;
        let timer;
        const startedAt = Date.now();

        async function poll() {
            try {
                const response = await fetch(`/api/mpesa/status?paymentId=${paymentId}&orderId=${orderId}`, { cache: 'no-store' });
                const data = await response.json();
                if (!active) return;

                if (data.status === 'paid' || data.status === 'successful') {
                    setStatus('success');
                    setMpesaReceipt(data.mpesaReceiptNumber || data.payment?.mpesa_receipt_number || '');
                    setPayments((current) => current.map((payment) => payment.id === paymentId ? { ...payment, ...data.payment } : payment));
                    return;
                }
                if (data.status === 'failed' || data.status === 'cancelled') {
                    setStatus('failed');
                    return;
                }
                if (Date.now() - startedAt > 180000) {
                    setStatus('failed');
                    return;
                }
                timer = setTimeout(poll, 4000);
            } catch {
                if (Date.now() - startedAt > 180000) {
                    setStatus('failed');
                } else {
                    timer = setTimeout(poll, 4000);
                }
            }
        }

        poll();
        return () => {
            active = false;
            if (timer) clearTimeout(timer);
        };
    }, [paymentId, status, orderId]);

    const sendPaymentRequest = async (event) => {
        event.preventDefault();
        setError('');
        setStatus('initiating');

        try {
            const response = await fetch('/api/payments/mpesa/stkpush', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, payerPhone }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Unable to send the payment request.');
            setPaymentId(data.paymentId);
            setStatus('pending');
        } catch (paymentError) {
            setError(paymentError.message);
            setStatus('failed');
        }
    };

    if (!order && !error) {
        return <div className="mx-auto max-w-5xl px-4 py-20 text-stone-600">Loading payment details…</div>;
    }

    if (error && !order) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-20">
                <p className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">{error}</p>
                <Link href="/checkout" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">Return to checkout</Link>
            </div>
        );
    }

    const latestPayment = payments.find((payment) => payment.id === paymentId) || payments[0];

    if (status === 'success') {
        return (
            <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="rounded-[2rem] border border-emerald-200 bg-white p-8 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Payment successful</p>
                    <h1 className="mt-2 text-3xl font-semibold text-stone-900">Payment received successfully</h1>
                    <p className="mt-3 text-stone-600">Your order is now being processed.</p>
                    <div className="mt-6 grid gap-4 rounded-2xl bg-stone-50 p-5 text-sm text-stone-700 sm:grid-cols-2">
                        <p><span className="font-semibold text-stone-900">Order:</span> {order.order_reference}</p>
                        <p><span className="font-semibold text-stone-900">Amount:</span> KES {Number(order.total).toLocaleString('en-KE')}</p>
                        <p><span className="font-semibold text-stone-900">M-Pesa receipt:</span> {mpesaReceipt || 'Confirming'}</p>
                        <p><span className="font-semibold text-stone-900">Status:</span> Processing</p>
                    </div>
                    <Link href="/products" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">Continue shopping</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.18em]">
                <span className="rounded-full bg-emerald-600 px-4 py-2 text-white">1. Customer details</span>
                <span className="h-px w-8 bg-stone-300" />
                <span className="rounded-full bg-stone-900 px-4 py-2 text-white">2. Payment</span>
                <span className="h-px w-8 bg-stone-300" />
                <span className="rounded-full bg-stone-100 px-4 py-2 text-stone-500">3. Confirmation</span>
            </div>

            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Complete Your Payment</p>
                    <h1 className="mt-2 text-3xl font-semibold text-stone-900">Pay securely with M-Pesa</h1>
                    <p className="mt-3 text-sm leading-7 text-stone-600">Your order has been received. Send a payment request to the M-Pesa number you want to use.</p>

                    {status === 'pending' ? (
                        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                            <p className="font-semibold">Waiting for Payment</p>
                            <p className="mt-2">An M-Pesa payment request has been sent. Enter your M-Pesa PIN to complete the transaction.</p>
                        </div>
                    ) : null}

                    {status === 'failed' ? (
                        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                            {error || 'Your payment could not be confirmed. The order remains saved and you can retry.'}
                        </div>
                    ) : null}

                    {order.payment_status !== 'paid' ? (
                        <form onSubmit={sendPaymentRequest} className="mt-8 space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-stone-800">Enter the M-Pesa number you want to pay with</label>
                                <input required disabled={status === 'pending' || status === 'initiating'} value={payerPhone} onChange={(event) => setPayerPhone(event.target.value)} className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-stone-900 disabled:bg-stone-100" placeholder="0712345678" />
                            </div>
                            <button type="submit" disabled={status === 'pending' || status === 'initiating'} className="w-full rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60">
                                {status === 'initiating' ? 'Sending request…' : status === 'pending' ? 'Payment request sent' : status === 'failed' ? 'Retry Payment' : 'Send Payment Request'}
                            </button>
                        </form>
                    ) : null}
                </div>

                <aside className="rounded-[1.5rem] border border-stone-200 bg-stone-900 p-6 text-white shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Order {order.order_reference}</p>
                    <h2 className="mt-2 text-xl font-semibold">Order summary</h2>
                    <div className="mt-6 space-y-3">
                        {items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm text-stone-300">
                                <span>{item.product_name || 'Item'} × {item.quantity}</span>
                                <span>{formatCurrency(item.subtotal || item.unit_price * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4 text-base font-semibold">
                        <span>Total payable</span><span>{formatCurrency(order.total)}</span>
                    </div>
                    <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm leading-7 text-stone-300">
                        <p><span className="font-semibold text-white">Customer:</span> {order.customer_name}</p>
                        <p><span className="font-semibold text-white">Contact:</span> {order.phone}</p>
                        <p><span className="font-semibold text-white">Address:</span> {order.delivery_address}</p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
