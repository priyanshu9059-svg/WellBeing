import type { Metadata } from 'next';
import { Geist, Lora } from 'next/font/google';
import './globals.css';
import './features.css';
import { brand } from '@/config/brand';
import { LanguageProvider } from '@/components/language-provider';

const sans = Geist({ variable: '--font-sans', subsets: ['latin'] });
const serif = Lora({ variable: '--font-serif', subsets: ['latin'] });
export const metadata: Metadata = { title: `${brand.name} — ${brand.tagline}`, description: brand.description };
export const viewport = { themeColor: '#596281', width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><head><link rel="manifest" href="/manifest.webmanifest"/><meta property="og:title" content="Wellbeing Support — Support at your pace"/><meta property="og:description" content="You don’t have to face this moment alone."/><meta property="og:image" content="https://wellbeing-support-priyanshu.priyanshu9059.chatgpt.site/og.png"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="Wellbeing Support — Support at your pace"/><meta name="twitter:description" content="You don’t have to face this moment alone."/><meta name="twitter:image" content="https://wellbeing-support-priyanshu.priyanshu9059.chatgpt.site/og.png"/></head><body className={`${sans.variable} ${serif.variable}`}><LanguageProvider>{children}</LanguageProvider></body></html>; }
