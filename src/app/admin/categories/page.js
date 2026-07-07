'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

export default function AdminCategoriesPage() {
    const { push } = useToast();
    const [categories, setCategories] = useState([]);
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    async function onSubmit(event) {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, slug, description }),
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Unable to create category.');
            }

            push('Category saved.', 'success');
            setCategories((current) => [payload, ...current]);
            setName('');
            setSlug('');
            setDescription('');
        } catch (error) {
            push(error.message || 'Unable to create category.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Admin</p>
                <h1 className="mt-2 text-3xl font-semibold text-stone-900">Categories</h1>

                <form onSubmit={onSubmit} className="mt-8 grid gap-4 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-6 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Name</label>
                        <input value={name} onChange={(event) => setName(event.target.value)} required className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Slug</label>
                        <input value={slug} onChange={(event) => setSlug(event.target.value)} required className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Description</label>
                        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3" />
                    </div>
                    <div className="md:col-span-2">
                        <button type="submit" disabled={isSubmitting} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                            {isSubmitting ? 'Saving…' : 'Save category'}
                        </button>
                    </div>
                </form>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                    {categories.map((category) => (
                        <div key={category.id} className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
                            <h2 className="text-lg font-semibold text-stone-900">{category.name}</h2>
                            <p className="mt-2 text-sm text-stone-600">{category.description}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">/{category.slug}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
