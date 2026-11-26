'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/store-data';
import { useToast } from '@/components/ui/ToastProvider';

const normalizeWhatsAppNumber = (value) => value.replace(/[^0-9]/g, '').replace(/^0/, '254');

const absoluteImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    return new URL(imageUrl, siteUrl).toString();
};

export default function CheckoutPage() {
    const { items, subtotal, clearCart } = useCart();
    const { push } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ name: '', phone: '', address: '', notes: '' });

    const handleSubmit = (event) => {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const whatsappNumber = normalizeWhatsAppNumber(
                process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '254703576876'
            );

            const orderLines = items.map((item, index) => {
                const line = `${index + 1}. ${item.name} × ${item.quantity} — KES ${Number(item.price * item.quantity).toLocaleString('en-KE')}`;
                const imageUrl = absoluteImageUrl(item.image);
                return imageUrl ? `${line}\n   Image: ${imageUrl}` : line;
            });

            const message = [
                'Hello Step Into Style! 👋',
                'I would like to place a new order.',
                '',
                'CUSTOMER DETAILS',
                `Name: ${formData.name}`,
                `Phone: ${formData.phone}`,
                `Delivery address: ${formData.address}`,
                formData.notes ? `Notes: ${formData.notes}` : null,
                '',
                'ORDER SUMMARY',
                ...orderLines,
                '',
                `TOTAL: KES ${Number(subtotal).toLocaleString('en-KE')}`,
                '',
                'Please confirm availability and delivery. Thank you! 😊',
            ].filter((line) => line !== null).join('\n');

            window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
            clearCart();
            push('Your complete order has been prepared on WhatsApp.', 'success');
        } catch (submitError) {
            setError('We could not open WhatsApp. Please try again or contact support.');
            push(submitError.message || 'Unable to open WhatsApp.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-20 text-center">
                <h1 className="text-3xl font-semibold text-stone-900">Checkout is empty</h1>
                <p className="mt-3 text-stone-600">Add items to your bag before placing an order.</p>
                <Link href="/products" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">Continue shopping</Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-sm">
                    <h1 className="text-3xl font-semibold text-stone-900">Checkout</h1>
                    <p className="mt-3 text-sm leading-7 text-stone-600">Send your order directly to our WhatsApp team for availability and delivery confirmation.</p>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-stone-800">Full name</label>
                            <input required value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-stone-900" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-stone-800">Phone number</label>
                            <input required value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-stone-900" placeholder="0712345678" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-stone-800">Delivery address</label>
                            <textarea required value={formData.address} onChange={(event) => setFormData({ ...formData, address: event.target.value })} className="min-h-[120px] w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-stone-900" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-stone-800">Additional notes</label>
                            <textarea value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} className="min-h-[100px] w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-stone-900" />
                        </div>
                        {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
                        <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60">
                            {isSubmitting ? 'Opening WhatsApp…' : 'Order on WhatsApp'}
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
                        <span>Total</span><span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm leading-7 text-stone-300">
                        <p className="font-semibold text-white">WhatsApp order</p>
                        <p className="mt-2">Your items and delivery details are prepared as a message.</p>
                        <p className="mt-2">The store team confirms availability and payment by chat.</p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
