'use client';

import { useRef, useState } from 'react';
import ResponsiveImage from '@/components/ui/ResponsiveImage';

export default function ImageUploader({
    label = 'Image',
    onImageUpload,
    previewUrl,
    isUploading = false,
    error = null,
}) {
    const fileInputRef = useRef(null);
    const [preview, setPreview] = useState(previewUrl);
    const [fileName, setFileName] = useState('');

    function handleFileSelect(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target?.result);
        };
        reader.readAsDataURL(file);

        onImageUpload(file);
    }

    return (
        <div>
            <label className="mb-2 block text-sm font-semibold text-stone-800">{label}</label>

            <div
                className="relative flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-8 transition-colors hover:border-stone-400 hover:bg-stone-100"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-stone-400', 'bg-stone-100');
                }}
                onDragLeave={(e) => {
                    e.currentTarget.classList.remove('border-stone-400', 'bg-stone-100');
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-stone-400', 'bg-stone-100');
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                        fileInputRef.current = Object.create(HTMLInputElement.prototype);
                        Object.defineProperty(fileInputRef.current, 'files', {
                            value: { 0: file, length: 1 },
                        });
                        handleFileSelect({ target: fileInputRef.current });
                    }
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    className="hidden"
                    aria-label={`Upload ${label}`}
                />

                {isUploading ? (
                    <div className="text-center">
                        <p className="text-sm text-stone-600">Uploading…</p>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-sm font-medium text-stone-600">Click to upload or drag and drop</p>
                        <p className="mt-1 text-xs text-stone-500">JPG, PNG, or WebP up to 5MB</p>
                        {fileName && <p className="mt-2 text-xs font-medium text-stone-700">{fileName}</p>}
                    </div>
                )}
            </div>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            {preview && (
                <div className="mt-4 rounded-[1.5rem] border border-stone-200 bg-white p-4">
                    <p className="mb-2 text-sm font-semibold text-stone-700">Preview</p>
                    <ResponsiveImage
                        src={preview}
                        alt="Preview"
                        width={1200}
                        height={800}
                        className="h-40 w-full rounded-2xl object-cover"
                    />
                </div>
            )}
        </div>
    );
}
