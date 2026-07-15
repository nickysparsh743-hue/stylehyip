import Link from 'next/link';
import ProductCard from '@/components/store/ProductCard';
import ShareButton from '@/components/shared/ShareButton';
import { getCategories } from '@/lib/services/category.service';
import { getProducts } from '@/lib/services/product.service';

export async function generateStaticParams() {
    const categories = await getCategories();
    return categories.map((category) => ({ slug: category.slug }));
}

export default async function CategoryPage({ params }) {
    const categories = await getCategories();
    const category = categories.find((item) => item.slug === params.slug);

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

    const allProducts = await getProducts({ limit: 100 });
    const categoryProducts = allProducts.filter((product) => product.category_id === category.id);

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Category</p>
                    <h1 className="mt-2 text-3xl font-semibold text-stone-900">{category.name}</h1>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">{category.description}</p>
                </div>
                <ShareButton type="category" title={category.name} slug={category.slug} />
            </div>
            <div className="grid gap-4 grid-cols-3 sm:grid-cols-3 lg:grid-cols-4">
                {categoryProducts.length > 0 ? (
                    categoryProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-10">
                        <p className="text-stone-600">No products in this category yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
