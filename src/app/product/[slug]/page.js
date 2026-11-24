import Link from 'next/link';
import ShareButton from '@/components/shared/ShareButton';
import ResponsiveImage from '@/components/ui/ResponsiveImage';
import AddToCartButton from '@/components/store/AddToCartButton';
import { formatCurrency } from '@/lib/store-data';
import { getProducts, getProductBySlug, normalizeSlug } from '@/lib/services/product.service';

export async function generateStaticParams() {
    const products = await getProducts();
    return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductDetailPage({ params }) {
    const { slug } = await params;
    let product;

    try {
        product = await getProductBySlug(normalizeSlug(decodeURIComponent(String(slug ?? ''))));
    } catch {
        product = null;
    }

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

    const categoryHref = product.category ? `/categories/${product.category}` : '/shop';
    const productImage = product.image_url || product.image || product.category_image_url || '/placeholder-product.jpg';
    const productFallbackImage = product.category_image_url || product.image_url || null;

    return (
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-16 lg:grid-cols-[1fr_0.9fr] lg:gap-10 lg:px-8">
            <ResponsiveImage src={productImage} fallbackSrc={productFallbackImage} alt={product.name} width={1200} height={1400} className="h-[320px] w-full rounded-[1.25rem] object-cover sm:h-[480px] sm:rounded-[2rem] lg:h-[520px]" />
            <div className="space-y-5 sm:space-y-6">
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">{product.badge}</p>
                        <ShareButton type="product" title={product.name} slug={product.slug} />
                    </div>
                    <h1 className="text-2xl font-semibold text-stone-900 sm:text-4xl">{product.name}</h1>
                    <p className="text-base leading-7 text-stone-600 sm:text-lg sm:leading-8">{product.description}</p>
                    {product.category_name ? (
                        <p className="text-sm text-stone-600">
                            Category: <Link href={categoryHref} className="font-semibold text-stone-900 underline-offset-4 hover:underline">{product.category_name}</Link>
                        </p>
                    ) : null}
                </div>
                <div className="rounded-[1.25rem] border border-stone-200 bg-white p-4 shadow-sm sm:rounded-[1.5rem] sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-stone-500 sm:text-sm">Price</p>
                        <p className="text-2xl font-semibold text-stone-900 sm:text-3xl">{formatCurrency(product.price)}</p>
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
