'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import ImageUploader from '@/components/ui/ImageUploader';
import { uploadProductImage } from '@/lib/supabase/storage';

export default function NewProductPage() {
    const { push } = useToast();
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({ name: '', slug: '', description: '', price: '0', stock: '0', category_id: '', image_url: '', is_featured: false });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [imageError, setImageError] = useState(null);

    useEffect(() => {
        async function loadCategories() {
            const response = await fetch('/api/categories');
            if (response.ok) {
                const payload = await response.json();
                setCategories(payload);
            }
        }

        loadCategories();
    }, []);

    async function handleImageUpload(file) {
        setImageError(null);
        setIsUploadingImage(true);

        try {
            const { publicUrl } = await uploadProductImage(file);
            setForm((prev) => ({ ...prev, image_url: publicUrl }));
        } catch (error) {
            setImageError(error.message || 'Failed to upload image');
        } finally {
            setIsUploadingImage(false);
        }
    }

    async function onSubmit(event) {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    price: Number(form.price),
                    stock: Number(form.stock),
                    is_featured: Boolean(form.is_featured),
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Unable to save product.');
            }

            push('Product saved.', 'success');
        } catch (error) {
            push(error.message || 'Unable to save product.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Admin</p>
                <h1 className="mt-2 text-3xl font-semibold text-stone-900">Add product</h1>
                <p className="mt-3 text-stone-600">Create a product with a category from the database.</p>
                <form onSubmit={onSubmit} className="mt-8 space-y-4">
                    <input className="w-full rounded-2xl border border-stone-300 px-4 py-3" placeholder="Product name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                    <input className="w-full rounded-2xl border border-stone-300 px-4 py-3" placeholder="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required />
                    <input className="w-full rounded-2xl border border-stone-300 px-4 py-3" placeholder="Price" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required />
                    <input className="w-full rounded-2xl border border-stone-300 px-4 py-3" placeholder="Stock" type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} required />
                    <div className="space-y-3">
                        <ImageUploader
                            label="Product image"
                            previewUrl={form.image_url}
                            onImageUpload={handleImageUpload}
                            isUploading={isUploadingImage}
                            error={imageError}
                        />
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                            <label className="mb-2 block text-sm font-semibold text-stone-800">Or paste an image URL</label>
                            <input
                                value={form.image_url}
                                onChange={(event) => {
                                    setImageError(null);
                                    setForm({ ...form, image_url: event.target.value });
                                }}
                                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3"
                                placeholder="https://example.com/image.jpg"
                            />
                            <p className="mt-2 text-xs text-stone-500">Upload a file or paste a direct image link from any website.</p>
                        </div>
                    </div>
                    <select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} className="w-full rounded-2xl border border-stone-300 px-4 py-3">
                        <option value="">Select Category</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                    <textarea className="min-h-[120px] w-full rounded-2xl border border-stone-300 px-4 py-3" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                    <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                        <input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} />
                        Featured product
                    </label>
                    <div className="flex gap-4">
                        <button disabled={isSubmitting} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{isSubmitting ? 'Saving…' : 'Save'}</button>
                        <Link href="/admin/products" className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700">Cancel</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
