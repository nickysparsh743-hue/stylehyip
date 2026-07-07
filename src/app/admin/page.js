import Link from 'next/link';

const cards = [
    { title: 'Products', href: '/admin/products' },
    { title: 'Categories', href: '/admin/categories' },
    { title: 'Orders', href: '/admin/orders' },
    { title: 'Customers', href: '/admin/users' },
    { title: 'Settings', href: '/admin/settings' },
];

export default function AdminDashboardPage() {
    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Admin dashboard</p>
                <h1 className="mt-2 text-3xl font-semibold text-stone-900">Manage your fashion store</h1>
                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {cards.map((card) => (
                        <Link key={card.title} href={card.href} className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-6 transition hover:bg-stone-100">
                            <h2 className="text-xl font-semibold text-stone-900">{card.title}</h2>
                            <p className="mt-2 text-sm text-stone-600">Open the {card.title.toLowerCase()} management area.</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
