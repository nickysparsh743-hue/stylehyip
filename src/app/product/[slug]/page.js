import Link from 'next/link';
import AddToCartButton from '@/components/store/AddToCartButton';
import { formatCurrency, products } from '@/lib/store-data';

export function generateStaticParams() {
    return products.map((product) => ({ slug: product.slug }));
}

export default function ProductDetailPage({ params }) {
    const product = products.find((item) => item.slug === params.slug);

    if (!product) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-20 text-center">
                <h1 className="text-3xl font-semibold text-stone-900">Product not found</h1>
                <p className="mt-3 text-stone-600">The item you are looking for is not available right now.</p>
                <Link href="/shop" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">
                    Browse shop
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
            <img src={product.image} alt={product.name} className="h-[480px] w-full rounded-[2rem] object-cover" />
            <div className="space-y-6">
                <div className="space-y-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">{product.badge}</p>
                    <h1 className="text-4xl font-semibold text-stone-900">{product.name}</h1>
                    <p className="text-lg leading-8 text-stone-600">{product.description}</p>
                </div>
                <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-sm uppercase tracking-[0.2em] text-stone-500">Price</p>
                        <p className="text-3xl font-semibold text-stone-900">{formatCurrency(product.price)}</p>
                    </div>
                    <p className="mt-4 text-sm text-stone-600">In stock: {product.stock} units</p>
                    <div className="mt-6">
                        <AddToCartButton product={product} label="Add to bag" />
                    </div>
                </div>
                <div className="rounded-[1.5rem] border border-stone-200 bg-stone-100 p-6 text-sm leading-7 text-stone-600">
                    <p className="font-semibold text-stone-900">Shipping & delivery</p>
                    <p className="mt-2">Nationwide delivery within 1–3 working days in major towns and cities across Kenya.</p>
                </div>
            </div>
        </div>
    );
}
