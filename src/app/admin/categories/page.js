'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import ResponsiveImage from '@/components/ui/ResponsiveImage';
import ImageUploader from '@/components/ui/ImageUploader';
import { uploadCategoryImage, deleteStorageFile, getStorageFilePathFromUrl } from '@/lib/supabase/storage';

const emptyForm = {
    name: '',
    slug: '',
    description: '',
    background_image_url: '',
};

export default function AdminCategoriesPage() {
    const { push } = useToast();
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [busyCategoryId, setBusyCategoryId] = useState(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [imageError, setImageError] = useState(null);
    const [oldImagePath, setOldImagePath] = useState(null);

    async function loadCategories() {
        const response = await fetch('/api/categories');
        if (response.ok) {
            setCategories(await response.json());
        }
    }

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadCategories();
        }, 0);

        return () => {
            window.clearTimeout(timer);
        };
    }, []);

    function resetForm() {
        setEditingCategoryId(null);
        setForm(emptyForm);
        setOldImagePath(null);
        setImageError(null);
    }

    function startEdit(category) {
        setEditingCategoryId(category.id);
        setForm({
            name: category.name || '',
            slug: category.slug || '',
            description: category.description || '',
            background_image_url: category.background_image_url || '',
        });
        setOldImagePath(category.background_image_url ? getStorageFilePathFromUrl(category.background_image_url) : null);
    }

    async function handleImageUpload(file) {
        setImageError(null);
        setIsUploadingImage(true);

        try {
            const { publicUrl, path } = await uploadCategoryImage(file);

            if (oldImagePath) {
                try {
                    await deleteStorageFile(oldImagePath);
                } catch (deleteError) {
                    console.warn('Failed to delete old image:', deleteError);
                }
            }

            setForm((prev) => ({ ...prev, background_image_url: publicUrl }));
            setOldImagePath(path);
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
            const response = await fetch('/api/categories', {
                method: editingCategoryId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingCategoryId ? { id: editingCategoryId, ...form } : form),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || 'Unable to save category.');
            }

            push(editingCategoryId ? 'Category updated.' : 'Category saved.', 'success');
            await loadCategories();
            resetForm();
        } catch (error) {
            push(error.message || 'Unable to save category.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function onDelete(category) {
        if (!window.confirm(`Delete ${category.name}?`)) {
            return;
        }

        setBusyCategoryId(category.id);

        try {
            const response = await fetch('/api/categories', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: category.id }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || 'Unable to delete category.');
            }

            push('Category deleted.', 'success');
            await loadCategories();
            if (editingCategoryId === category.id) {
                resetForm();
            }
        } catch (error) {
            push(error.message || 'Unable to delete category.', 'error');
        } finally {
            setBusyCategoryId(null);
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
                        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Slug</label>
                        <input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-stone-800">Description</label>
                        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3" />
                    </div>
                    <div className="md:col-span-2">
                        <ImageUploader
                            label="Background image"
                            previewUrl={form.background_image_url}
                            onImageUpload={handleImageUpload}
                            isUploading={isUploadingImage}
                            error={imageError}
                        />
                        <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                            <label className="mb-2 block text-sm font-semibold text-stone-800">Or paste an image URL</label>
                            <input
                                value={form.background_image_url}
                                onChange={(event) => {
                                    setImageError(null);
                                    setForm({ ...form, background_image_url: event.target.value });
                                }}
                                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3"
                                placeholder="https://example.com/banner.jpg"
                            />
                            <p className="mt-2 text-xs text-stone-500">Upload a file or paste a direct image link from any website.</p>
                        </div>
                    </div>
                    <div className="md:col-span-2 flex flex-wrap gap-3">
                        <button type="submit" disabled={isSubmitting} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                            {isSubmitting ? 'Saving…' : editingCategoryId ? 'Save changes' : 'Save category'}
                        </button>
                        {editingCategoryId ? (
                            <button type="button" onClick={resetForm} className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700">
                                Cancel
                            </button>
                        ) : null}
                    </div>
                </form>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                    {categories.map((category) => (
                        <div key={category.id} className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
                            {category.background_image_url ? (
                                <ResponsiveImage src={category.background_image_url} alt={category.name} width={1200} height={800} className="mb-4 h-32 w-full rounded-[1.25rem] object-cover" />
                            ) : null}
                            <h2 className="text-lg font-semibold text-stone-900">{category.name}</h2>
                            <p className="mt-2 text-sm text-stone-600">{category.description}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">/{category.slug}</p>
                            <div className="mt-4 flex flex-wrap gap-3">
                                <button type="button" onClick={() => startEdit(category)} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">
                                    Edit
                                </button>
                                <button type="button" onClick={() => onDelete(category)} disabled={busyCategoryId === category.id} className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60">
                                    {busyCategoryId === category.id ? 'Deleting…' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
