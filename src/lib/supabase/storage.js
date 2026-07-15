import { supabaseBrowser } from './client';

const BUCKET_NAME = 'product-images';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function getFileExtension(file) {
    const mimeToExt = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
    };
    return mimeToExt[file.type] || file.name.split('.').pop();
}

export async function validateImageFile(file) {
    if (!file) {
        throw new Error('No file selected');
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Only JPEG, PNG, and WebP images are allowed');
    }

    if (file.size > MAX_SIZE) {
        throw new Error('File size must be less than 5MB');
    }

    return true;
}

export async function uploadProductImage(file) {
    await validateImageFile(file);

    const fileName = `${generateUUID()}.${getFileExtension(file)}`;
    const filePath = `products/${fileName}`;

    const { data, error } = await supabaseBrowser.storage.from(BUCKET_NAME).upload(filePath, file);

    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: publicUrlData } = supabaseBrowser.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return {
        path: filePath,
        publicUrl: publicUrlData.publicUrl,
    };
}

export async function uploadCategoryImage(file) {
    await validateImageFile(file);

    const fileName = `${generateUUID()}.${getFileExtension(file)}`;
    const filePath = `categories/${fileName}`;

    const { data, error } = await supabaseBrowser.storage.from(BUCKET_NAME).upload(filePath, file);

    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: publicUrlData } = supabaseBrowser.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return {
        path: filePath,
        publicUrl: publicUrlData.publicUrl,
    };
}

export async function deleteStorageFile(filePath) {
    const { error } = await supabaseBrowser.storage.from(BUCKET_NAME).remove([filePath]);

    if (error) {
        throw new Error(`Delete failed: ${error.message}`);
    }

    return true;
}

export function getStorageFilePathFromUrl(publicUrl) {
    if (!publicUrl) return null;
    const match = publicUrl.match(/\/storage\/v1\/object\/public\/product-images\/(.+)$/);
    return match ? match[1] : null;
}
