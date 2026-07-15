'use client';

import Image from 'next/image';

const ALLOWED_HOSTS = ['images.unsplash.com', 'cdn.corenexis.com', 'supabase.co', 'supabase.in', 'komodo.ai'];

function getHostname(src) {
    if (typeof src !== 'string') {
        return '';
    }

    try {
        return new URL(src).hostname;
    } catch {
        return '';
    }
}

function shouldUseNextImage(src) {
    if (!src || typeof src !== 'string') {
        return false;
    }

    if (src.startsWith('/')) {
        return true;
    }

    if (src.startsWith('data:')) {
        return false;
    }

    const hostname = getHostname(src);
    if (!hostname) {
        return false;
    }

    return ALLOWED_HOSTS.some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
}

export default function ResponsiveImage({ src, alt, className = '', ...props }) {
    if (!src) {
        return null;
    }

    if (shouldUseNextImage(src)) {
        return <Image src={src} alt={alt} className={className} {...props} />;
    }

    const { width, height, priority, loading, ...rest } = props;
    return (
        <img
            src={src}
            alt={alt}
            width={width || 800}
            height={height || 600}
            loading={loading || 'lazy'}
            decoding="async"
            className={className}
            {...rest}
        />
    );
}
