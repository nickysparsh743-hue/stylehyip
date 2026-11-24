'use client';

import { useState } from 'react';
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

export default function ResponsiveImage({ src, alt, className = '', fallbackSrc, ...props }) {
    const [imageSrc, setImageSrc] = useState(src);
    const [hasFallback, setHasFallback] = useState(false);

    if (!src && !fallbackSrc) {
        return null;
    }

    const activeSrc = hasFallback ? (fallbackSrc || src) : (imageSrc || src || fallbackSrc);

    const handleError = () => {
        if (fallbackSrc && !hasFallback) {
            setHasFallback(true);
            setImageSrc(fallbackSrc);
            return;
        }

        if (!hasFallback && src !== fallbackSrc) {
            setHasFallback(true);
            setImageSrc(src || fallbackSrc);
        }
    };

    if (shouldUseNextImage(activeSrc)) {
        return <Image src={activeSrc} alt={alt} className={className} onError={handleError} {...props} />;
    }

    const { width, height, priority, loading, ...rest } = props;
    return (
        <img
            src={activeSrc}
            alt={alt}
            width={width || 800}
            height={height || 600}
            loading={loading || 'lazy'}
            decoding="async"
            className={className}
            onError={handleError}
            {...rest}
        />
    );
}
