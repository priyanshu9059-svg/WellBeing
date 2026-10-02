import type { Metadata } from 'next';
import './globals.css';
import './features.css';
import { brand } from '@/config/brand';
import { LanguageProvider } from '@/components/language-provider';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')),
  title: `${brand.name} — ${brand.tagline}`,
  description: brand.description,
  openGraph: { title: `${brand.name} — ${brand.tagline}`, description: brand.description, images: ['/og.png'] },
  twitter: { card: 'summary_large_image', title: `${brand.name} — ${brand.tagline}`, description: brand.description, images: ['/og.png'] },
};
export const viewport = { themeColor: '#596281', width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><head><link rel="manifest" href="/manifest.webmanifest"/></head><body><LanguageProvider>{children}</LanguageProvider></body></html>; }
