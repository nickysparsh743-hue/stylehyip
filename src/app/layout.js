import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import ClientShell from '@/components/layout/ClientShell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Step Into Style',
    template: '%s | Step Into Style',
  },
  description: 'A premium Kenyan fashion store with M-Pesa and nationwide delivery.',
  keywords: ['fashion', 'Kenya', 'M-Pesa', 'shopping', 'style'],
  openGraph: {
    title: 'Step Into Style',
    description: 'Shop premium fashion in Kenya with secure M-Pesa checkout.',
    type: 'website',
    locale: 'en_KE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Step Into Style',
    description: 'Shop premium fashion in Kenya with secure M-Pesa checkout.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#F8F9FA] text-black">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
