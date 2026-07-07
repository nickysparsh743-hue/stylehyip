'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { CartProvider, useCart } from '@/context/CartContext';
import { AuthProvider, useAuth } from '@/lib/context/AuthContext';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { siteConfig } from '@/lib/store-data';

function NavBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { itemCount } = useCart();
    const { user, role, signOut } = useAuth();

    const links = [
        { href: '/', label: 'Home' },
        { href: '/products', label: 'Shop' },
        { href: '/categories/sneakers', label: 'Categories' },
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
            <div className="hidden border-b border-stone-200 bg-stone-950 px-4 py-2 text-sm text-stone-300 sm:block">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                    <span>🚚 Delivering across Kenya</span>
                    <span>💳 Pay securely with M-Pesa</span>
                    <span>📦 1-3 days nationwide delivery</span>
                </div>
            </div>
            <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <Link href="/" className="text-xl font-semibold tracking-[0.2em] uppercase text-stone-900">
                        Style<span className="text-amber-500">Kicks</span>
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
                    <div className="flex items-center gap-3">
                        <Link href="/products" className="hidden rounded-full border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 sm:inline-flex">
                            Search
                        </Link>
                        {user ? (
                            <>
                                <Link href="/profile" className="rounded-full border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:text-stone-900">
                                    Profile
                                </Link>
                                <button type="button" onClick={signOut} className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black">
                                    Sign out
                                </button>
                            </>
                        ) : (
                            <Link href="/auth/login" className="rounded-full border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:text-stone-900">
                                Login
                            </Link>
                        )}
                        <Link href="/cart" className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">
                            Bag ({itemCount})
                        </Link>
                    </div>
                </div>
            </header>
        </>
    );
}

function Footer() {
    return (
        <footer className="border-t border-stone-200 bg-stone-950 text-stone-300">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
                <div>
                    <p className="text-lg font-semibold text-white">{siteConfig.name}</p>
                    <p className="mt-2 max-w-xl text-sm text-stone-400">{siteConfig.tagline}</p>
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
                        <a href="mailto:hello@stepintostyle.co.ke" className="block hover:text-white">Help Center</a>
                        <a href="/checkout" className="block hover:text-white">Returns</a>
                        <a href="/contact" className="block hover:text-white">Shipping</a>
                    </div>
                </div>
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Connect</h3>
                    <div className="mt-3 space-y-2 text-sm">
                        <a href="https://wa.me/254700000000" className="block hover:text-white">WhatsApp</a>
                        <a href="https://instagram.com" className="block hover:text-white">Instagram</a>
                        <a href="https://facebook.com" className="block hover:text-white">Facebook</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default function ClientShell({ children }) {
    return (
        <ToastProvider>
            <AuthProvider>
                <CartProvider>
                    <div className="flex min-h-screen flex-col bg-white text-stone-800">
                        <Suspense fallback={null}>
                            <NavBar />
                        </Suspense>
                        <main className="flex-1">{children}</main>
                        <Footer />
                        <div className="sticky bottom-0 z-20 border-t border-stone-200 bg-white px-3 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] sm:hidden">
                            <div className="flex items-center justify-between">
                                <Link href="/" className="flex flex-1 flex-col items-center text-xs text-stone-600">🏠<span>Home</span></Link>
                                <Link href="/products" className="flex flex-1 flex-col items-center text-xs text-stone-600">🛍️<span>Shop</span></Link>
                                <Link href="/categories/sneakers" className="flex flex-1 flex-col items-center text-xs text-stone-600">🗂️<span>Categories</span></Link>
                                <Link href="/cart" className="flex flex-1 flex-col items-center text-xs text-stone-600">🛒<span>Bag</span></Link>
                            </div>
                        </div>
                    </div>
                </CartProvider>
            </AuthProvider>
        </ToastProvider>
    );
}
