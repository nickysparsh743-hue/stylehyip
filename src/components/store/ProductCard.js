'use client';

import { useState } from 'react';
import Link from 'next/link';
import ShareButton from '@/components/shared/ShareButton';
import ResponsiveImage from '@/components/ui/ResponsiveImage';
import AddToCartButton from './AddToCartButton';
import { formatCurrency } from '@/lib/store-data';

export default function ProductCard({ product }) {
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const productImage = product.image_url || product.image || product.category_image_url || '/placeholder-product.jpg';
    const productFallbackImage = product.category_image_url || product.image_url || null;
    const description = product.description || '';
    const shortDescription = description.split(/\s+/).slice(0, 3).join(' ');

    return (
        <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[1rem] border border-stone-200 bg-white shadow-sm sm:rounded-[1.25rem]">
            <div className="relative">
                <Link href={`/products/${product.slug}`} className="block">
                    <ResponsiveImage
                        src={productImage}
                        fallbackSrc={productFallbackImage}
                        alt={product.name}
                        width={800}
                        height={800}
                        loading="lazy"
                        sizes="(max-width: 639px) 33vw, (max-width: 1024px) 50vw, 25vw"
                        className="aspect-[4/5] w-full object-cover"
                    />
                </Link>
                <div className="absolute right-1.5 top-1.5 sm:right-3 sm:top-3">
                    <ShareButton type="product" title={product.name} slug={product.slug} />
                </div>
            </div>

            <div className="flex flex-1 flex-col p-2 sm:p-4 lg:p-5">
                <div className="flex min-w-0 items-center justify-between gap-1 sm:gap-3">
                    {product.badge ? (
                        <p className="min-w-0 truncate rounded-full bg-stone-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-stone-600 sm:px-3 sm:py-1 sm:text-xs sm:tracking-[0.2em]">
                            {product.badge}
                        </p>
                    ) : <span />}
                    <p className="shrink-0 text-[9px] font-medium text-stone-500 sm:text-sm">{product.stock} left</p>
                </div>

                <div className="mt-2 flex-1 sm:mt-4">
                    <Link href={`/products/${product.slug}`} className="block line-clamp-2 text-xs font-semibold leading-4 text-stone-900 sm:text-lg sm:leading-6">
                        {product.name}
                    </Link>
                    <div className="mt-1 text-[10px] leading-4 text-stone-600 sm:mt-2 sm:text-sm sm:leading-6">
                        <p className="sm:hidden">{isDescriptionExpanded ? description : shortDescription}</p>
                        <p className="hidden sm:block line-clamp-3 lg:line-clamp-4">{description}</p>
                        {description.split(/\s+/).length > 3 ? (
                            <button
                                type="button"
                                onClick={() => setIsDescriptionExpanded((current) => !current)}
                                aria-expanded={isDescriptionExpanded}
                                className="mt-0.5 font-semibold text-stone-900 underline decoration-stone-400 underline-offset-2 sm:hidden"
                            >
                                {isDescriptionExpanded ? 'Read less' : 'Read more'}
                            </button>
                        ) : null}
                    </div>
                </div>

                <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-500 sm:mt-4 sm:gap-2 sm:text-sm">
                    <span className="truncate">{'★'.repeat(product.rating || 5)}</span>
                    <span className="text-stone-500">({product.reviews || 0})</span>
                </div>

                <div className="mt-2 flex min-w-0 flex-col gap-1 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <p className="truncate text-xs font-semibold text-stone-900 sm:text-lg">{formatCurrency(product.price)}</p>
                    <Link href={`/products/${product.slug}`} className="hidden text-sm font-semibold text-stone-700 hover:text-stone-900 sm:block">Details</Link>
                </div>

                <div className="mt-2 sm:mt-3">
                    <AddToCartButton product={product} label="Add" />
                </div>
            </div>
        </article>
    );
}
