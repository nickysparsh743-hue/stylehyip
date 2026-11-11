'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/store-data';
import { useToast } from '@/components/ui/ToastProvider';

export default function CheckoutPage() {
    const { items, subtotal, clearCart } = useCart();
    const { push } = useToast();
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentState, setPaymentState] = useState('idle');
    const [error, setError] = useState('');
    const [paymentId, setPaymentId] = useState(null);
    const [orderId, setOrderId] = useState(null);
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        notes: '',
    });

    useEffect(() => {
        if (!paymentId || paymentState !== 'pending') {
            return undefined;
        }

        let isMounted = true;
        let timeoutId;
        const startedAt = Date.now();

        const pollForStatus = async () => {
            try {
                const response = await fetch(`/api/mpesa/status?paymentId=${paymentId}`, { cache: 'no-store' });
                const data = await response.json();

                if (!isMounted) {
                    return;
                }

                if (data.status === 'paid') {
                    setPaymentState('success');
                    return;
                }

                if (data.status === 'failed' || data.status === 'cancelled') {
                    setPaymentState(data.status);
                    return;
                }

                if (Date.now() - startedAt > 180000) {
                    setPaymentState('failed');
                    return;
                }

                timeoutId = setTimeout(pollForStatus, 4000);
            } catch (pollError) {
                if (!isMounted) {
                    return;
                }

                if (Date.now() - startedAt > 180000) {
                    setPaymentState('failed');
                    return;
                }

                timeoutId = setTimeout(pollForStatus, 4000);
            }
        };

        pollForStatus();

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [paymentId, paymentState]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);
        setPaymentState('initiating');

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, items, subtotal }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Unable to process your M-Pesa payment request.');
            }

            setPaymentDetails(data);
            setPaymentId(data.paymentId || null);
            setOrderId(data.orderId || null);
            setSubmitted(true);
            setPaymentState('pending');
            clearCart();
            push('M-Pesa prompt sent. Check your phone to complete your payment.', 'success');
        } catch (err) {
            setPaymentState('failed');
            setError(err.message || 'Something went wrong.');
            push(err.message || 'Something went wrong.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (items.length === 0 && !submitted) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-20 text-center">
                <h1 className="text-3xl font-semibold text-stone-900">Checkout is empty</h1>
                <p className="mt-3 text-stone-600">Add items to your bag before placing an order.</p>
                <Link href="/products" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">
                    Continue shopping
                </Link>
            </div>
        );
    }

    if (submitted) {
        const isSuccess = paymentState === 'success';
        const isPending = paymentState === 'pending';
        const isCancelled = paymentState === 'cancelled';
        const isFailed = paymentState === 'failed';

        return (
            <div className="mx-auto max-w-5xl px-4 py-20">
                <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                    <p className={`text-sm font-semibold uppercase tracking-[0.2em] ${isSuccess ? 'text-emerald-600' : isPending ? 'text-amber-600' : 'text-rose-600'}`}>
                        {isSuccess ? 'Payment confirmed' : isPending ? 'Awaiting payment' : isCancelled ? 'Payment cancelled' : 'Payment failed'}
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold text-stone-900">
                        {isSuccess ? 'Your M-Pesa payment was successful' : isPending ? 'Check your phone to complete payment' : 'M-Pesa payment was not completed'}
                    </h1>
                    <p className="mt-3 text-stone-600">
                        {isSuccess
                            ? 'Your order is now confirmed and the payment has been accepted.'
                            : isPending
                                ? 'A Safaricom STK push has been sent to the phone number you provided. Enter your M-Pesa PIN to continue.'
                                : 'Please try again or contact support if this keeps happening.'}
                    </p>

                    <div className="mt-6 rounded-2xl bg-stone-50 p-5 text-sm text-stone-700">
                        <p className="font-semibold text-stone-900">Order ID</p>
                        <p className="mt-1">{orderId || 'Pending'}</p>
                        <p className="mt-4 font-semibold text-stone-900">Reference</p>
                        <p className="mt-1">{paymentDetails?.paymentReference || paymentDetails?.checkoutRequestId || 'Pending'}</p>
                        <p className="mt-4 font-semibold text-stone-900">Amount</p>
                        <p className="mt-1">KES {Number(paymentDetails?.total || subtotal || 0).toLocaleString('en-KE')}</p>
                        <p className="mt-4 font-semibold text-stone-900">Status</p>
                        <p className="mt-1 capitalize">{isSuccess ? 'paid' : paymentState}</p>
                    </div>

                    {isPending ? (
                        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            Please do not close this page. We will confirm the payment automatically once Safaricom sends the callback.
                        </div>
                    ) : null}

                    <Link href="/products" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">
                        Shop again
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-sm">
                <h1 className="text-3xl font-semibold text-stone-900">Checkout</h1>
                <p className="mt-3 text-sm leading-7 text-stone-600">We support M-Pesa for fast confirmation and nationwide delivery.</p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Full name</label>
                        <input required value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Phone number</label>
                        <input required value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" placeholder="0712345678" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Delivery address</label>
                        <textarea required value={formData.address} onChange={(event) => setFormData({ ...formData, address: event.target.value })} className="min-h-[120px] w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Notes</label>
                        <textarea value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} className="min-h-[100px] w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
                    </div>
                    {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
                    <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60">
                        {isSubmitting ? 'Preparing M-Pesa…' : 'Pay with M-PESA'}
                    </button>
                </form>
            </div>

            <aside className="rounded-[1.5rem] border border-stone-200 bg-stone-900 p-6 text-white shadow-sm">
                <h2 className="text-xl font-semibold">Order summary</h2>
                <div className="mt-6 space-y-4">
                    {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm text-stone-300">
                            <span>{item.name} × {item.quantity}</span>
                            <span>{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4 text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm leading-7 text-stone-300">
                    <p className="font-semibold text-white">M-Pesa payment details</p>
                    <p className="mt-2">We will send a secure STK push to your phone.</p>
                    <p className="mt-2">No PIN is entered on this website.</p>
                </div>
            </aside>
        </div>
    );
}
