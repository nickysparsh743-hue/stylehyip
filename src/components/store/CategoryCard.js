'use client';

import { useState } from 'react';
import Link from 'next/link';
import ShareButton from '@/components/shared/ShareButton';
import ResponsiveImage from '@/components/ui/ResponsiveImage';

export default function CategoryCard({ category }) {
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const imageSrc = category.background_image_url || category.image || '/placeholder-product.jpg';
    const description = category.description || '';
    const shortDescription = description.split(/\s+/).slice(0, 3).join(' ');

    return (
        <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-[1rem] border border-stone-200 bg-white shadow-sm sm:rounded-[1.25rem]">
            <div className="relative">
                <Link href={`/categories/${category.slug}`} className="block">
                    <ResponsiveImage
                        src={imageSrc}
                        alt={category.name}
                        width={800}
                        height={600}
                        loading="lazy"
                        sizes="(max-width: 639px) 33vw, (max-width: 1024px) 50vw, 25vw"
                        className="aspect-[4/3] w-full object-cover sm:aspect-[5/4]"
                    />
                </Link>
                <div className="absolute right-1.5 top-1.5 sm:right-3 sm:top-3">
                    <ShareButton type="category" title={category.name} slug={category.slug} />
                </div>
            </div>
            <div className="flex flex-1 flex-col p-2 sm:p-4">
                <Link href={`/categories/${category.slug}`} className="block">
                    <h3 className="line-clamp-2 text-xs font-semibold leading-4 text-stone-900 sm:text-base sm:leading-6">{category.name}</h3>
                </Link>
                <div className="mt-1 text-[10px] leading-4 text-stone-600 sm:mt-2 sm:text-sm sm:leading-6">
                    <p className="sm:hidden">{isDescriptionExpanded ? description : shortDescription}</p>
                    <p className="hidden sm:block line-clamp-3">{description}</p>
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
        </div>
    );
}
