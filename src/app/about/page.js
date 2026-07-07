import Link from 'next/link';

export default function AboutPage() {
    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">About Step Into Style</p>
                    <h1 className="text-4xl font-semibold text-stone-900">Fashion rooted in confidence and culture</h1>
                    <p className="text-lg leading-8 text-stone-600">
                        Step Into Style is a Kenyan fashion store that brings together elevated essentials, bold accessories, and everyday comfort for customers who want to feel polished from the first step to the last.
                    </p>
                    <Link href="/shop" className="inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">
                        Explore fashion
                    </Link>
                </div>
                <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
                    <img src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80" alt="Fashion styling" className="h-[360px] w-full object-cover" />
                </div>
            </div>
        </div>
    );
}
