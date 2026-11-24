import Link from 'next/link';
import ProductCard from '@/components/store/ProductCard';
import { getProducts, rankSearchResults } from '@/lib/services/product.service';

export default async function SearchPage({ searchParams }) {
    const rawQuery = String(searchParams?.q ?? '').trim();

    if (!rawQuery) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-20 text-center">
                <h1 className="text-3xl font-semibold text-stone-900">Search products</h1>
                <p className="mt-3 text-stone-600">Use the search box in the navbar to find products across the catalog.</p>
                <Link href="/products" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">
                    Browse all products
                </Link>
            </div>
        );
    }

    const products = await getProducts({ search: rawQuery });
    const rankedProducts = rankSearchResults(products, rawQuery);

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Search results</p>
                    <h1 className="mt-2 text-3xl font-semibold text-stone-900">{rawQuery}</h1>
                </div>
                <p className="text-sm text-stone-600">{rankedProducts.length} result{rankedProducts.length === 1 ? '' : 's'}</p>
            </div>

            {rankedProducts.length === 0 ? (
                <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-8 text-center text-stone-600">
                    No products found for “{rawQuery}”.
                </div>
            ) : (
                <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                    {rankedProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </div>
    );
}
