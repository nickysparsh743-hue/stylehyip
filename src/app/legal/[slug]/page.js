import { notFound } from 'next/navigation';
import { getPublicSiteSettings } from '@/lib/services/site-settings.service';

const pages = {
    privacy: ['privacyPolicy', 'Privacy Policy'],
    terms: ['termsAndConditions', 'Terms and Conditions'],
    returns: ['returnPolicy', 'Return and Refund Policy'],
    shipping: ['shippingPolicy', 'Shipping Policy'],
    cancellation: ['cancellationPolicy', 'Cancellation Policy'],
};

export default async function LegalPage({ params }) {
    const { slug } = await params;
    const page = pages[slug];
    if (!page) notFound();

    const settings = await getPublicSiteSettings();
    const content = settings.legal[page[0]];

    return (
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-semibold text-stone-900">{page[1]}</h1>
            {content ? (
                <article className="prose prose-stone mt-8 max-w-none whitespace-pre-wrap leading-8" dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
                <p className="mt-8 text-stone-600">This policy has not been published yet.</p>
            )}
        </div>
    );
}
