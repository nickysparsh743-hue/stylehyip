'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/store-data';

export default function CartPage() {
    const { items, updateQuantity, removeFromCart, clearCart, subtotal, itemCount } = useCart();

    if (items.length === 0) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-20 text-center">
                <h1 className="text-3xl font-semibold text-stone-900">Your bag is empty</h1>
                <p className="mt-3 text-stone-600">Add a few favourites to see them here.</p>
                <Link href="/shop" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">
                    Continue shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Your bag</p>
                    <h1 className="mt-2 text-3xl font-semibold text-stone-900">{itemCount} item(s) selected</h1>
                </div>
                <button type="button" onClick={clearCart} className="text-sm font-semibold text-stone-700 hover:text-stone-900">
                    Clear bag
                </button>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                    {items.map((item) => (
                        <div key={item.id} className="flex flex-col gap-4 rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                            <Image src={item.image} alt={item.name} width={400} height={400} className="h-28 w-full rounded-2xl object-cover sm:w-28" />
                            <div className="flex-1">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-stone-900">{item.name}</h2>
                                        <p className="mt-1 text-sm text-stone-600">{formatCurrency(item.price)}</p>
                                    </div>
                                    <button type="button" onClick={() => removeFromCart(item.id)} className="text-sm font-semibold text-stone-500 hover:text-stone-900">
                                        Remove
                                    </button>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="inline-flex items-center rounded-full border border-stone-300 p-1">
                                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-1 text-lg">−</button>
                                        <span className="min-w-10 text-center text-sm font-semibold">{item.quantity}</span>
                                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-1 text-lg">+</button>
                                    </div>
                                    <p className="text-sm font-semibold text-stone-900">{formatCurrency(item.price * item.quantity)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <aside className="rounded-[1.5rem] border border-stone-200 bg-stone-900 p-6 text-white shadow-sm">
                    <h2 className="text-xl font-semibold">Order summary</h2>
                    <div className="mt-6 space-y-3 text-sm text-stone-300">
                        <div className="flex items-center justify-between">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Shipping</span>
                            <span>Calculated at checkout</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-white/20 pt-3 text-base font-semibold text-white">
                            <span>Total</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                    </div>
                    <Link href="/checkout" className="mt-8 inline-flex w-full justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-900">
                        Proceed to checkout
                    </Link>
                </aside>
            </div>
        </div>
    );
}
