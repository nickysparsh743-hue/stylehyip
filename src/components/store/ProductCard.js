'use client';

import Link from 'next/link';
import ShareButton from '@/components/shared/ShareButton';
import ResponsiveImage from '@/components/ui/ResponsiveImage';
import AddToCartButton from './AddToCartButton';
import { formatCurrency } from '@/lib/store-data';

export default function ProductCard({ product }) {
    const productImage = product.image || '/placeholder-product.jpg';

    return (
        <article className="flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-sm">
            <div className="relative">
                <Link href={`/products/${product.slug}`} className="block">
                    <ResponsiveImage src={productImage} alt={product.name} width={800} height={800} loading="lazy" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="h-44 w-full object-cover sm:h-56" />
                </Link>
                <div className="absolute right-3 top-3">
                    <ShareButton type="product" title={product.name} slug={product.slug} />
                </div>
            </div>
            <div className="flex flex-1 flex-col p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                    <p className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">
                        {product.badge}
                    </p>
                    <p className="text-sm font-medium text-stone-500">{product.stock} left</p>
                </div>
                <div className="mt-4 flex-1">
                    <Link href={`/products/${product.slug}`} className="text-lg font-semibold text-stone-900">
                        {product.name}
                    </Link>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{product.description}</p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-amber-500">
                    {'★'.repeat(product.rating || 5)}
                    <span className="text-stone-500">({product.reviews || 0})</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-stone-900">{formatCurrency(product.price)}</p>
                    <Link href={`/products/${product.slug}`} className="text-sm font-semibold text-stone-700 hover:text-stone-900">
                        Details
                    </Link>
                </div>
                <div className="mt-3">
                    <AddToCartButton product={product} label="Add" />
                </div>
            </div>
        </article>
    );
}
