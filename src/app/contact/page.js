import Link from 'next/link';

export default function ContactPage() {
    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="space-y-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Contact us</p>
                    <h1 className="text-4xl font-semibold text-stone-900">We are here to help you shop with ease</h1>
                    <p className="text-lg leading-8 text-stone-600">
                        Reach out for styling advice, delivery questions, or support with your order. Our team is ready to help you step into your next look.
                    </p>
                    <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-sm">
                        <p className="font-semibold text-stone-900">Email</p>
                        <p className="mt-2 text-stone-600">hello@stepintostyle.co.ke</p>
                        <p className="mt-4 font-semibold text-stone-900">Phone</p>
                        <p className="mt-2 text-stone-600">+254 700 000 000</p>
                    </div>
                </div>
                <div className="rounded-[2rem] border border-stone-200 bg-stone-900 p-8 text-white shadow-sm">
                    <h2 className="text-2xl font-semibold">Need help with your order?</h2>
                    <p className="mt-3 text-base leading-7 text-stone-300">Send us your order details and preferred contact method and we will follow up quickly.</p>
                    <div className="mt-8 flex flex-wrap gap-4">
                        <Link href="/shop" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-900">Shop now</Link>
                        <a href="mailto:hello@stepintostyle.co.ke" className="rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white">Email support</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
