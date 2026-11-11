import Link from 'next/link';
import CategoryCard from '@/components/store/CategoryCard';
import { getCategories } from '@/lib/services/category.service';

export default async function CategoriesPage() {
    const categories = await getCategories();

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Browse collections</p>
                <h1 className="mt-2 text-3xl font-semibold text-stone-900">Categories</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
                    Explore every category in the store and jump straight to the products in each collection.
                </p>
            </div>

            {categories.length === 0 ? (
                <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-8 text-center text-stone-600">
                    No categories found.
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {categories.map((category) => (
                        <CategoryCard key={category.id} category={category} />
                    ))}
                </div>
            )}

            <div className="mt-8 text-center">
                <Link href="/products" className="inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">
                    Browse all products
                </Link>
            </div>
        </div>
    );
}
