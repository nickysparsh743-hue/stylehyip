'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductCard from '@/components/store/ProductCard';

export default function ShopPage() {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            const [productsResponse, categoriesResponse] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/categories'),
            ]);

            if (productsResponse.ok) {
                const payload = await productsResponse.json();
                setProducts(payload);
            }

            if (categoriesResponse.ok) {
                const payload = await categoriesResponse.json();
                setCategories(payload);
            }

            setIsLoading(false);
        }

        loadData();
    }, []);

    const filteredProducts = useMemo(() => {
        if (selectedCategory === 'all') return products;
        return products.filter((product) => product.category === selectedCategory || product.category_id === selectedCategory);
    }, [products, selectedCategory]);

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Curated collection</p>
                    <h1 className="mt-2 text-3xl font-semibold text-stone-900">Shop the latest essentials</h1>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
                        From polished staples to statement pieces, discover fashion that fits your day, your plans, and your style.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSelectedCategory('all')} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedCategory === 'all' ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 border border-stone-200'}`}>
                        All
                    </button>
                    {categories.map((category) => (
                        <button key={category.id} type="button" onClick={() => setSelectedCategory(category.id)} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedCategory === category.id ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 border border-stone-200'}`}>
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-8 text-sm text-stone-600">Loading products…</div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                    {filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </div>
    );
}
