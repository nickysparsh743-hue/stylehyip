'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function AddToCartButton({ product, label = 'Add to cart' }) {
    const { addToCart } = useCart();

    return (
        <div className="flex min-w-0 flex-wrap gap-1.5 sm:gap-3">
            <button
                type="button"
                onClick={() => addToCart(product)}
                className="min-w-0 flex-1 rounded-full bg-stone-900 px-2 py-2 text-[10px] font-semibold text-white transition hover:bg-stone-700 sm:flex-none sm:px-5 sm:py-3 sm:text-sm"
            >
                {label}
            </button>
            <Link
                href="/cart"
                className="hidden rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900 sm:inline-flex"
            >
                View cart
            </Link>
        </div>
    );
}
