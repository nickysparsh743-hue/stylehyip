import Link from 'next/link';
import ResponsiveImage from '@/components/ui/ResponsiveImage';
import ProductCard from '@/components/store/ProductCard';
import CategoryCard from '@/components/store/CategoryCard';
import { getCategories } from '@/lib/services/category.service';
import { getProducts } from '@/lib/services/product.service';
import { getPublicSiteSettings } from '@/lib/services/site-settings.service';

const featureItems = [
  { icon: '💳', title: 'M-Pesa Accepted', text: 'Fast, secure payments across Kenya.' },
  { icon: '🚚', title: 'Nationwide Delivery', text: 'Reach anywhere in 1-3 days.' },
  { icon: '💬', title: 'WhatsApp Support', text: 'Chat with our style team instantly.' },
  { icon: '↺', title: 'Easy Returns', text: '7-day return policy on every order.' },
];

export default async function HomePage() {
  const [categories, featuredProducts, newArrivals, siteSettings] = await Promise.all([
    getCategories(),
    getProducts({ featured: true, limit: 10 }),
    getProducts({ limit: 10 }),
    getPublicSiteSettings(),
  ]);
  const homepage = siteSettings.homepage;

  return (
    <div className="bg-white">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          <div className="rounded-[1.5rem] bg-[#111111] p-6 text-white sm:rounded-[2rem] sm:p-10 lg:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400 sm:text-sm">
              New style drop
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight sm:mt-4 sm:text-5xl">
              {homepage.heroHeading}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300 sm:mt-4 sm:text-lg sm:leading-8">
              {homepage.heroDescription}
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href={homepage.heroButtonLink || '/products'}
                className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300"
              >
                {homepage.heroButtonText}
              </Link>
              <Link
                href="/products"
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                New arrivals
              </Link>
            </div>
            <div className="mt-6 flex gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/50" />
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-stone-50 p-2 shadow-sm sm:rounded-[2rem] sm:p-4">
            <ResponsiveImage
              src={homepage.heroBackgroundImage || 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80'}
              alt="Fashion showcase"
              width={1200}
              height={900}
              priority
              className="h-[260px] w-full rounded-[1rem] object-cover sm:h-[420px] sm:rounded-[1.5rem]"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
          {featureItems.map((item) => (
            <div
              key={item.title}
              className="rounded-[1rem] border border-stone-200 bg-stone-50 p-3 shadow-sm sm:rounded-[1.25rem] sm:p-5"
            >
              <div className="text-xl sm:text-2xl">{item.icon}</div>
              <div className="mt-2 sm:mt-3">
                <strong className="text-sm text-stone-900 sm:text-base">
                  {item.title}
                </strong>
                <p className="mt-1 text-xs leading-5 text-stone-600 sm:text-sm sm:leading-6">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {homepage.featuredCategoriesVisible && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                Shop By Category
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-stone-900">
                Find your next favourite look
              </h2>
            </div>
            <Link
              href="/products"
              className="text-sm font-semibold text-stone-700 hover:text-stone-900"
            >
              View all <span className="ml-1">→</span>
            </Link>
          </div>
          <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>
      )}

      {homepage.featuredProductsVisible && (
        <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                Best Sellers
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-stone-900">
                Most loved by our customers
              </h2>
            </div>
            <Link
              href="/products"
              className="text-sm font-semibold text-stone-700 hover:text-stone-900"
            >
              View all <span className="ml-1">→</span>
            </Link>
          </div>
          <div className="grid gap-4 grid-cols-3 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {homepage.newArrivalsVisible && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 rounded-[2rem] border border-stone-200 bg-stone-900 p-8 text-white shadow-sm lg:grid-cols-[0.8fr_1.2fr] lg:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
                New arrivals
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                Just landed for your next look
              </h2>
              <p className="mt-4 text-base leading-7 text-stone-300">
                Fresh styles for a bold season of dressing, from statement sneakers to
                polished accessories.
              </p>
              <Link
                href="/products"
                className="mt-6 inline-flex rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950"
              >
                Shop now
              </Link>
            </div>
            <div className="overflow-hidden rounded-[1.5rem]">
              <ResponsiveImage
                src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80"
                alt="New arrivals"
                width={1200}
                height={800}
                className="h-[260px] w-full rounded-[1.5rem] object-cover"
              />
            </div>
          </div>
        </section>
      )}

      {homepage.promotionalBannerImage && (
        <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <ResponsiveImage
            src={homepage.promotionalBannerImage}
            alt="Promotional banner"
            width={1600}
            height={500}
            className="h-32 w-full rounded-2xl object-cover sm:h-52"
          />
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['2,000+', 'Customers'],
            ['100% Secure', 'Payments protected'],
            ['Original', 'Products guaranteed'],
            ['Fast', 'Delivery across Kenya'],
          ].map(([title, text]) => (
            <div
              key={title}
              className="rounded-[1.25rem] border border-stone-200 bg-stone-50 p-5 shadow-sm"
            >
              <p className="text-lg font-semibold text-stone-900">{title}</p>
              <p className="mt-1 text-sm text-stone-600">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
