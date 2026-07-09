import Image from 'next/image';
import Link from 'next/link';
import ProductCard from '@/components/store/ProductCard';
import { getCategories } from '@/lib/services/category.service';
import { getProducts } from '@/lib/services/product.service';
import { siteConfig } from '@/lib/store-data';

const featureItems = [
  { icon: '💳', title: 'M-Pesa Accepted', text: 'Fast, secure payments across Kenya.' },
  { icon: '🚚', title: 'Nationwide Delivery', text: 'Reach anywhere in 1-3 days.' },
  { icon: '💬', title: 'WhatsApp Support', text: 'Chat with our style team instantly.' },
  { icon: '↺', title: 'Easy Returns', text: '7-day return policy on every order.' },
];

export default async function HomePage() {
  const [categories, featuredProducts, newArrivals] = await Promise.all([
    getCategories(),
    getProducts({ featured: true, limit: 4 }),
    getProducts({ limit: 4 }),
  ]);

  return (
    <div className="bg-white">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] bg-[#111111] p-8 text-white sm:p-10 lg:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">New style drop</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">{siteConfig.tagline}</h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-stone-300">Premium sneakers, handbags, and fashion essentials delivered across Kenya.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/products" className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300">Shop now</Link>
              <Link href="/products" className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">New arrivals</Link>
            </div>
            <div className="mt-8 flex gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/50" />
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-stone-50 p-4 shadow-sm">
            <Image src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80" alt="Fashion showcase" width={1200} height={900} priority className="h-[420px] w-full rounded-[1.5rem] object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {featureItems.map((item) => (
            <div key={item.title} className="rounded-[1.25rem] border border-stone-200 bg-stone-50 p-5 shadow-sm">
              <div className="text-2xl">{item.icon}</div>
              <div className="mt-3">
                <strong className="text-stone-900">{item.title}</strong>
                <p className="mt-1 text-sm leading-6 text-stone-600">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Shop By Category</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-900">Find your next favourite look</h2>
          </div>
          <Link href="/products" className="text-sm font-semibold text-stone-700 hover:text-stone-900">
            View all <span className="ml-1">→</span>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {categories.map((category) => (
            <Link key={category.id} href={`/categories/${category.slug}`} className="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-sm">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-stone-900">{category.name}</h3>
                <p className="mt-1 text-sm leading-6 text-stone-600">{category.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Best Sellers</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-900">Most loved by our customers</h2>
          </div>
          <Link href="/products" className="text-sm font-semibold text-stone-700 hover:text-stone-900">
            View all <span className="ml-1">→</span>
          </Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 rounded-[2rem] border border-stone-200 bg-stone-900 p-8 text-white shadow-sm lg:grid-cols-[0.8fr_1.2fr] lg:p-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">New arrivals</p>
            <h2 className="mt-3 text-3xl font-semibold">Just landed for your next look</h2>
            <p className="mt-4 text-base leading-7 text-stone-300">Fresh styles for a bold season of dressing, from statement sneakers to polished accessories.</p>
            <Link href="/products" className="mt-6 inline-flex rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950">Shop now</Link>
          </div>
          <div className="overflow-hidden rounded-[1.5rem]">
            <Image src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80" alt="New arrivals" width={1200} height={800} className="h-[260px] w-full rounded-[1.5rem] object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['2,000+', 'Customers'],
            ['100% Secure', 'Payments protected'],
            ['Original', 'Products guaranteed'],
            ['Fast', 'Delivery across Kenya'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-[1.25rem] border border-stone-200 bg-stone-50 p-5 shadow-sm">
              <p className="text-lg font-semibold text-stone-900">{title}</p>
              <p className="mt-1 text-sm text-stone-600">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
