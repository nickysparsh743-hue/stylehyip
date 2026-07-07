import Link from 'next/link';
import ProductCard from '@/components/store/ProductCard';
import { categories, products } from '@/lib/store-data';

export default function CategoryPage({ params }) {
    const category = categories.find((item) => item.slug === params.slug);
    const categoryProducts = products.filter((product) => product.category === params.slug);

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

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Category</p>
                <h1 className="mt-2 text-3xl font-semibold text-stone-900">{category.name}</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">{category.description}</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                {categoryProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
}
