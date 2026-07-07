'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminProductsPage() {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        async function loadProducts() {
            const response = await fetch('/api/products');
            if (response.ok) {
                setProducts(await response.json());
            }
        }

        loadProducts();
    }, []);

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Admin</p>
                    <h1 className="mt-2 text-3xl font-semibold text-stone-900">Products</h1>
                </div>
                <Link href="/admin/products/new" className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">Add product</Link>
            </div>
            <div className="mt-8 grid gap-4">
                {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
                        <div>
                            <h2 className="text-lg font-semibold text-stone-900">{product.name}</h2>
                            <p className="text-sm text-stone-600">{product.description}</p>
                        </div>
                        <p className="text-sm font-semibold text-stone-900">{product.stock} in stock</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
