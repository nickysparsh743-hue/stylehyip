'use client';

import Link from 'next/link';
import ShareButton from '@/components/shared/ShareButton';
import ResponsiveImage from '@/components/ui/ResponsiveImage';

export default function CategoryCard({ category }) {
    const imageSrc = category.background_image_url || category.image || '/placeholder-product.jpg';

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-sm">
            <div className="relative">
                <Link href={`/categories/${category.slug}`} className="block">
                    <ResponsiveImage
                        src={imageSrc}
                        alt={category.name}
                        width={800}
                        height={600}
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="h-28 w-full object-cover sm:h-32"
                    />
                </Link>
                <div className="absolute right-3 top-3">
                    <ShareButton type="category" title={category.name} slug={category.slug} />
                </div>
            </div>
            <div className="flex flex-1 flex-col p-3 sm:p-4">
                <Link href={`/categories/${category.slug}`} className="flex-1">
                    <h3 className="overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold text-stone-900">{category.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-stone-600">{category.description}</p>
                </Link>
            </div>
        </div>
    );
}
