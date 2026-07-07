'use client';

import Link from 'next/link';
import AddToCartButton from './AddToCartButton';
import { formatCurrency } from '@/lib/store-data';

export default function ProductCard({ product }) {
    return (
        <article className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm">
            <Link href={`/product/${product.slug}`} className="block">
                <img src={product.image} alt={product.name} className="h-60 w-full object-cover" />
            </Link>
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-3">
                    <p className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">
                        {product.badge}
                    </p>
                    <p className="text-sm font-medium text-stone-500">{product.stock} left</p>
                </div>
                <div>
                    <Link href={`/product/${product.slug}`} className="text-xl font-semibold text-stone-900">
                        {product.name}
                    </Link>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{product.description}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-amber-500">
                    {'★'.repeat(product.rating || 5)}
                    <span className="text-stone-500">({product.reviews || 0})</span>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-stone-900">{formatCurrency(product.price)}</p>
                    <Link href={`/product/${product.slug}`} className="text-sm font-semibold text-stone-700 hover:text-stone-900">
                        Details
                    </Link>
                </div>
                <AddToCartButton product={product} label="Add" />
            </div>
        </article>
    );
}
