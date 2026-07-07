'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/store-data';
import { useToast } from '@/components/ui/ToastProvider';

export default function CheckoutPage() {
    const { items, subtotal, clearCart } = useCart();
    const { push } = useToast();
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        notes: '',
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, items, subtotal }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Unable to process your order request.');
            }

            setPaymentDetails(data);
            setSubmitted(true);
            clearCart();
            push('Order request created. Please complete the M-Pesa payment.', 'success');
        } catch (err) {
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
        return (
            <div className="mx-auto max-w-5xl px-4 py-20">
                <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Order received</p>
                    <h1 className="mt-2 text-3xl font-semibold text-stone-900">Your M-Pesa payment is pending confirmation</h1>
                    <p className="mt-3 text-stone-600">Thank you for shopping with Step Into Style. We will contact you on WhatsApp or phone to confirm your payment once it is received.</p>
                    <div className="mt-6 rounded-2xl bg-stone-50 p-5 text-sm text-stone-700">
                        <p className="font-semibold text-stone-900">Reference</p>
                        <p className="mt-1">{paymentDetails?.paymentReference || 'Pending'}</p>
                        <p className="mt-4 font-semibold text-stone-900">Payment instructions</p>
                        <ul className="mt-2 space-y-2">
                            {paymentDetails?.instructions?.map((instruction) => (
                                <li key={instruction} className="leading-6">• {instruction}</li>
                            ))}
                        </ul>
                    </div>
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
                        <input required value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
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
                        {isSubmitting ? 'Processing order…' : 'Place order'}
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
                    <p className="mt-2">Paybill 123456</p>
                    <p>Account STEPSTYLE</p>
                </div>
            </aside>
        </div>
    );
}
