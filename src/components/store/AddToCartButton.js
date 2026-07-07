'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function AddToCartButton({ product, label = 'Add to cart' }) {
    const { addToCart } = useCart();

    return (
        <div className="flex flex-wrap gap-3">
            <button
                type="button"
                onClick={() => addToCart(product)}
                className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
                {label}
            </button>
            <Link
                href="/cart"
                className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
            >
                View cart
            </Link>
        </div>
    );
}
