import Link from 'next/link';
import ProductCard from '@/components/store/ProductCard';
import ShareButton from '@/components/shared/ShareButton';
import ResponsiveImage from '@/components/ui/ResponsiveImage';
import { getCategories, normalizeSlug } from '@/lib/services/category.service';
import { getProducts } from '@/lib/services/product.service';

export async function generateStaticParams() {
    const categories = await getCategories();
    return categories.map((category) => ({ slug: category.slug }));
}

export default async function CategoryPage({ params }) {
    const { slug } = await params;
    const categories = await getCategories();
    const requestedSlug = normalizeSlug(decodeURIComponent(String(slug ?? '')));
    const category = categories.find((item) => normalizeSlug(item.slug) === requestedSlug);

    if (!category) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-20 text-center">
                <h1 className="text-3xl font-semibold text-stone-900">Category not found</h1>
                <p className="mt-3 text-stone-600">This collection is not available right now.</p>
                <Link href="/products" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">
                    Browse products
                </Link>
            </div>
        );
    }

    const categoryProducts = await getProducts({ categorySlug: category.slug });

    const categoryImage = category.background_image_url || category.image || category.image_url || '/placeholder-product.jpg';

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-8 overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
                <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
                    <ResponsiveImage
                        src={categoryImage}
                        alt={category.name}
                        width={1200}
                        height={800}
                        className="h-64 w-full object-cover md:h-full"
                    />
                    <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Category</p>
                        <h1 className="text-3xl font-semibold text-stone-900">{category.name}</h1>
                        <p className="max-w-2xl text-base leading-7 text-stone-600">{category.description}</p>
                        <div className="flex items-center justify-start">
                            <ShareButton type="category" title={category.name} slug={category.slug} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-stone-900">Related products</h2>
            </div>

            <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {categoryProducts.length > 0 ? (
                    categoryProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))
                ) : (
                    <div className="col-span-full py-10 text-center">
                        <p className="text-stone-600">No products in this category yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
