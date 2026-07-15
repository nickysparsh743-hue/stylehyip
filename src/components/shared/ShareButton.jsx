'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { buildShareMessage, copyTextToClipboard, createShareUrl, openShareWindow } from '@/lib/share';

export default function ShareButton({ type, title, slug }) {
    const { push } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const shareUrl = useMemo(() => createShareUrl(type, slug), [type, slug]);
    const shareText = useMemo(() => buildShareMessage(type, title, shareUrl), [type, title, shareUrl]);
    const supportsNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

    async function handleShare() {
        if (supportsNativeShare) {
            try {
                await navigator.share({
                    title,
                    text: shareText,
                    url: shareUrl,
                });
                return;
            } catch {
                // Fall back to the dropdown menu when sharing is cancelled.
            }
        }

        setIsOpen((current) => !current);
    }

    async function handleCopyLink() {
        await copyTextToClipboard(shareUrl);
        push('Link copied successfully.', 'success');
        setIsOpen(false);
    }

    function handleWhatsApp() {
        openShareWindow(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
        setIsOpen(false);
    }

    function handleFacebook() {
        openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
        setIsOpen(false);
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={handleShare}
                aria-label={`Share ${type}`}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-700 shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M8.5 13.5 15.5 9" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8.5 10.5 15.5 15" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="6" cy="12" r="2.5" />
                    <circle cx="18" cy="8" r="2.5" />
                    <circle cx="18" cy="16" r="2.5" />
                </svg>
            </button>

            {!supportsNativeShare && isOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-44 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg" role="menu">
                    <button type="button" onClick={handleCopyLink} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-stone-50" role="menuitem">
                        <span aria-hidden="true">📋</span>
                        <span>Copy Link</span>
                    </button>
                    <button type="button" onClick={handleWhatsApp} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-stone-50" role="menuitem">
                        <span aria-hidden="true">🟢</span>
                        <span>WhatsApp</span>
                    </button>
                    <button type="button" onClick={handleFacebook} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-stone-50" role="menuitem">
                        <span aria-hidden="true">🔵</span>
                        <span>Facebook</span>
                    </button>
                </div>
            ) : null}
        </div>
    );
}
