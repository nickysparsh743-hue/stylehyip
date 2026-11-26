'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CartProvider, useCart } from '@/context/CartContext';
import { AuthProvider, useAuth } from '@/lib/context/AuthContext';
import { ToastProvider } from '@/components/ui/ToastProvider';
import NotificationCenter from '@/components/notifications/NotificationCenter';

function NavBar({ siteSettings }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { itemCount } = useCart();
    const { user, role, signOut } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');

    const links = [
        { href: '/', label: 'Home' },
        { href: '/products', label: 'Products' },
        { href: '/categories', label: 'Categories' },
        { href: '/about', label: 'About Us' },
    ];

    const isAdmin = role?.trim()?.toLowerCase?.() === 'admin';
    const visibleLinks = isAdmin ? [...links, { href: '/admin', label: 'Admin' }] : links;
    const unauthorized = searchParams.get('unauthorized') === '1';

    return (
        <>
            {unauthorized && (
                <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
                    You are not authorized to view the admin area.
                </div>
            )}
            {siteSettings?.homepage?.announcementText ? (
                <div className="bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-stone-950">
                    {siteSettings.homepage.announcementText}
                </div>
            ) : (
                <div className="hidden border-b border-stone-200 bg-stone-950 px-4 py-2 text-sm text-stone-300 sm:block">
                    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                        <span>🚚 Delivering across Kenya</span>
                        <span>💳 Pay securely with M-Pesa</span>
                        <span>📦 1-3 days nationwide delivery</span>
                    </div>
                </div>
            )}
            <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
                    <Link href="/" className="shrink-0 text-base font-semibold tracking-[0.12em] uppercase text-stone-900 sm:text-xl sm:tracking-[0.2em]">
                        {siteSettings?.general?.storeLogo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={siteSettings.general.storeLogo} alt={siteSettings.general.storeName} className="h-9 w-auto object-contain" />
                        ) : siteSettings?.general?.storeName || 'StyleKicks'}
                    </Link>
                    <nav className="hidden items-center gap-6 text-sm font-medium text-stone-600 md:flex">
                        {visibleLinks.map((link) => {
                            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                            return (
                                <Link key={link.href} href={link.href} className={isActive ? 'text-stone-900' : 'hover:text-stone-900'}>
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                const query = searchQuery.trim();
                                if (!query) {
                                    router.push('/products');
                                    return;
                                }
                                router.push(`/search?q=${encodeURIComponent(query)}`);
                            }}
                            className="hidden items-center gap-2 rounded-full border border-stone-300 bg-stone-50 px-3 py-2 sm:flex"
                        >
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search products"
                                className="w-32 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-400"
                            />
                            <button type="submit" className="text-sm font-semibold text-stone-700">Search</button>
                        </form>
                        {user ? (
                            <>
                                <Link href="/profile" className="rounded-full border border-stone-300 px-2 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 sm:px-3 sm:py-2 sm:text-sm">
                                    Profile
                                </Link>
                                <button type="button" onClick={signOut} className="rounded-full bg-amber-400 px-2 py-1.5 text-xs font-semibold text-black sm:px-4 sm:py-2 sm:text-sm">
                                    Sign out
                                </button>
                                <NotificationCenter />
                            </>
                        ) : (
                            <Link href="/auth/login" className="rounded-full border border-stone-300 px-2 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 sm:px-3 sm:py-2 sm:text-sm">
                                Login
                            </Link>
                        )}
                        <Link href="/cart" className="rounded-full bg-stone-900 px-2 py-1.5 text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm">
                            Bag ({itemCount})
                        </Link>
                    </div>
                </div>
            </header>
        </>
    );
}

function Footer({ siteSettings }) {
    const contact = siteSettings?.contact || {};
    const social = siteSettings?.social || {};
    const socialLinks = [
        ['Facebook', social.facebook], ['Instagram', social.instagram], ['TikTok', social.tiktok],
        ['X', social.twitter], ['YouTube', social.youtube], ['LinkedIn', social.linkedin],
    ].filter(([, url]) => url);
    return (
        <footer className="border-t border-stone-200 bg-stone-950 text-stone-300">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 sm:py-10 lg:grid-cols-4 lg:px-8">
                <div>
                    <p className="text-lg font-semibold text-white">{siteSettings?.general?.storeName}</p>
                    <p className="mt-2 max-w-xl text-sm text-stone-400">{siteSettings?.general?.tagline}</p>
                </div>
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Quick Links</h3>
                    <div className="mt-3 space-y-2 text-sm">
                        <Link href="/products" className="block hover:text-white">Shop</Link>
                        <Link href="/about" className="block hover:text-white">About</Link>
                        <Link href="/contact" className="block hover:text-white">Contact</Link>
                    </div>
                </div>
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Support</h3>
                    <div className="mt-3 space-y-2 text-sm">
                        {contact.supportEmail ? <a href={`mailto:${contact.supportEmail}`} className="block hover:text-white">Help Center</a> : null}
                        {contact.businessPhone ? <a href={`tel:${contact.businessPhone}`} className="block hover:text-white">{contact.businessPhone}</a> : null}
                        {contact.supportHours ? <p>{contact.supportHours}</p> : null}
                    </div>
                </div>
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Connect</h3>
                    <div className="mt-3 space-y-2 text-sm">
                        {contact.whatsappNumber ? <a href={`https://wa.me/${contact.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="block hover:text-white">WhatsApp</a> : null}
                        {socialLinks.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noreferrer" className="block hover:text-white">{name}</a>)}
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default function ClientShell({ children, siteSettings }) {
    return (
        <ToastProvider>
            <AuthProvider>
                <CartProvider>
                    <div className="flex min-h-screen flex-col bg-white text-stone-800">
                        <Suspense fallback={null}>
                            <NavBar siteSettings={siteSettings} />
                        </Suspense>
                        <main className="flex-1 pb-[68px] sm:pb-0">{children}</main>
                        <Footer siteSettings={siteSettings} />
                        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 bg-white px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] sm:hidden">
                            <div className="flex items-center justify-between">
                                <Link href="/" className="flex flex-1 flex-col items-center text-xs text-stone-600">🏠<span>Home</span></Link>
                                <Link href="/products" className="flex flex-1 flex-col items-center text-xs text-stone-600">🛍️<span>Products</span></Link>
                                <Link href="/categories" className="flex flex-1 flex-col items-center text-xs text-stone-600">🗂️<span>Categories</span></Link>
                                <Link href="/cart" className="flex flex-1 flex-col items-center text-xs text-stone-600">🛒<span>Bag</span></Link>
                            </div>
                        </div>
                    </div>
                </CartProvider>
            </AuthProvider>
        </ToastProvider>
    );
}
