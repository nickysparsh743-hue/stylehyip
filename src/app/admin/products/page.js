'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

const emptyForm = {
    name: '',
    slug: '',
    description: '',
    price: '0',
    stock: '0',
    category_id: '',
    image_url: '',
    is_featured: false,
};

export default function AdminProductsPage() {
    const { push } = useToast();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [editingProductId, setEditingProductId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [busyProductId, setBusyProductId] = useState(null);

    async function loadData() {
        const [productsResponse, categoriesResponse] = await Promise.all([
            fetch('/api/products'),
            fetch('/api/categories'),
        ]);

        if (productsResponse.ok) {
            setProducts(await productsResponse.json());
        }

        if (categoriesResponse.ok) {
            setCategories(await categoriesResponse.json());
        }
    }

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadData();
        }, 0);

        return () => {
            window.clearTimeout(timer);
        };
    }, []);

    function resetForm() {
        setEditingProductId(null);
        setForm(emptyForm);
    }

    function startEdit(product) {
        setEditingProductId(product.id);
        setForm({
            name: product.name || '',
            slug: product.slug || '',
            description: product.description || '',
            price: String(product.price ?? 0),
            stock: String(product.stock ?? 0),
            category_id: product.category_id || '',
            image_url: product.image_url || '',
            is_featured: Boolean(product.is_featured),
        });
    }

    async function onSubmit(event) {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                ...form,
                price: Number(form.price),
                stock: Number(form.stock),
                is_featured: Boolean(form.is_featured),
            };

            const response = await fetch('/api/products', {
                method: editingProductId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingProductId ? { id: editingProductId, ...payload } : payload),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || 'Unable to save product.');
            }

            push(editingProductId ? 'Product updated.' : 'Product saved.', 'success');
            await loadData();
            resetForm();
        } catch (error) {
            push(error.message || 'Unable to save product.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function onDelete(product) {
        if (!window.confirm(`Delete ${product.name}?`)) {
            return;
        }

        setBusyProductId(product.id);

        try {
            const response = await fetch('/api/products', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: product.id }),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || 'Unable to delete product.');
            }

            push('Product deleted.', 'success');
            await loadData();
            if (editingProductId === product.id) {
                resetForm();
            }
        } catch (error) {
            push(error.message || 'Unable to delete product.', 'error');
        } finally {
            setBusyProductId(null);
        }
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Admin</p>
                    <h1 className="mt-2 text-3xl font-semibold text-stone-900">Products</h1>
                </div>
                <Link href="/admin/products/new" className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">Add product</Link>
            </div>

            <div className="mt-8 rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-stone-900">{editingProductId ? 'Edit product' : 'Create product'}</h2>
                <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
                    <input className="w-full rounded-2xl border border-stone-300 px-4 py-3" placeholder="Product name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                    <input className="w-full rounded-2xl border border-stone-300 px-4 py-3" placeholder="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required />
                    <input className="w-full rounded-2xl border border-stone-300 px-4 py-3" placeholder="Price" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required />
                    <input className="w-full rounded-2xl border border-stone-300 px-4 py-3" placeholder="Stock" type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} required />
                    <input className="w-full rounded-2xl border border-stone-300 px-4 py-3" placeholder="Image URL" value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} />
                    <select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} className="w-full rounded-2xl border border-stone-300 px-4 py-3">
                        <option value="">Select Category</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                    <textarea className="min-h-[140px] w-full rounded-2xl border border-stone-300 px-4 py-3 md:col-span-2" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                    <label className="flex items-center gap-2 text-sm font-medium text-stone-700 md:col-span-2">
                        <input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} />
                        Featured product
                    </label>
                    {form.image_url ? (
                        <div className="md:col-span-2 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                            <p className="mb-2 text-sm font-semibold text-stone-700">Preview</p>
                            <img src={form.image_url} alt="Product preview" className="h-40 w-full rounded-2xl object-cover" />
                        </div>
                    ) : null}
                    <div className="flex flex-wrap gap-3 md:col-span-2">
                        <button type="submit" disabled={isSubmitting} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                            {isSubmitting ? 'Saving…' : editingProductId ? 'Save changes' : 'Create product'}
                        </button>
                        {editingProductId ? (
                            <button type="button" onClick={resetForm} className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700">
                                Cancel
                            </button>
                        ) : null}
                    </div>
                </form>
            </div>

            <div className="mt-8 grid gap-4">
                {products.map((product) => (
                    <div key={product.id} className="flex flex-col gap-4 rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-stone-900">{product.name}</h2>
                            <p className="text-sm text-stone-600">{product.description}</p>
                            <p className="mt-2 text-sm font-semibold text-stone-900">{product.stock} in stock</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button type="button" onClick={() => startEdit(product)} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">
                                Edit
                            </button>
                            <button type="button" onClick={() => onDelete(product)} disabled={busyProductId === product.id} className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60">
                                {busyProductId === product.id ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
