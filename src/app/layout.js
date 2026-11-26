import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import ClientShell from '@/components/layout/ClientShell';
import { getPublicSiteSettings } from '@/lib/services/site-settings.service';
import Script from 'next/script';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
});

export async function generateMetadata() {
  const settings = await getPublicSiteSettings();
  const metadata = {
    title: { default: settings.seo.title, template: `%s | ${settings.general.storeName}` },
    description: settings.seo.description,
    keywords: settings.seo.keywords ? settings.seo.keywords.split(',').map((value) => value.trim()).filter(Boolean) : [],
    authors: settings.seo.author ? [{ name: settings.seo.author }] : undefined,
    openGraph: {
      title: settings.seo.ogTitle || settings.seo.title,
      description: settings.seo.ogDescription || settings.seo.description,
      images: settings.seo.ogImage ? [settings.seo.ogImage] : undefined,
      type: 'website', locale: 'en_KE',
    },
  };
  if (settings.seo.searchConsoleVerification) metadata.other = { 'google-site-verification': settings.seo.searchConsoleVerification };
  if (settings.general.favicon) metadata.icons = { icon: settings.general.favicon };
  if (settings.seo.analyticsId) metadata.other = { ...metadata.other, 'google-analytics-id': settings.seo.analyticsId };
  return metadata;
}

export default async function RootLayout({ children }) {
  const settings = await getPublicSiteSettings();
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#F8F9FA] text-black">
        {settings.seo.analyticsId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(settings.seo.analyticsId)}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${settings.seo.analyticsId.replace(/[^a-zA-Z0-9-]/g, '')}')`}</Script>
          </>
        ) : null}
        <ClientShell siteSettings={settings}>{children}</ClientShell>
      </body>
    </html>
  );
}
