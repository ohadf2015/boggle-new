import { loadTranslation, type TranslationData } from '@/translations/loadTranslation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (['en','he','sv','ja','es'].includes(locale) ? locale : 'en') as Locale;
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const enT = await loadTranslation('en') as Record<string, any>;
  const seo = t?.seo?.contact || enT.seo.contact;
  const baseSeo = t?.seo || enT.seo;

  const localePath = `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/contact`,
      title: seo.ogTitle,
      description: seo.ogDescription,
      siteName: 'LexiClash',
      images: [
        {
          url: 'https://www.lexiclash.live/lexiclash.jpg',
          width: 1200,
          height: 630,
          alt: 'LexiClash - Multiplayer Word Game',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: ['https://www.lexiclash.live/lexiclash.jpg'],
    },
    alternates: {
      canonical: `https://www.lexiclash.live${localePath}/contact`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/contact',
        he: 'https://www.lexiclash.live/he/contact',
        en: 'https://www.lexiclash.live/en/contact',
        sv: 'https://www.lexiclash.live/sv/contact',
        ja: 'https://www.lexiclash.live/ja/contact',
        es: 'https://www.lexiclash.live/es/contact',
        'en-IL': 'https://www.lexiclash.live/en/contact',
        'he-IL': 'https://www.lexiclash.live/he/contact',
        'en-US': 'https://www.lexiclash.live/en/contact',
        'es-US': 'https://www.lexiclash.live/es/contact',
        'en-GB': 'https://www.lexiclash.live/en/contact',
        'en-SE': 'https://www.lexiclash.live/en/contact',
        'sv-SE': 'https://www.lexiclash.live/sv/contact',
        'en-JP': 'https://www.lexiclash.live/en/contact',
        'ja-JP': 'https://www.lexiclash.live/ja/contact',
        'en-ES': 'https://www.lexiclash.live/en/contact',
        'es-ES': 'https://www.lexiclash.live/es/contact',
        'en-MX': 'https://www.lexiclash.live/en/contact',
        'es-MX': 'https://www.lexiclash.live/es/contact',
        'en-AU': 'https://www.lexiclash.live/en/contact',
        'es-AR': 'https://www.lexiclash.live/es/contact',
        'es-CO': 'https://www.lexiclash.live/es/contact',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function ContactLayout({ children }: { children: ReactNode }): ReactNode {
  return children;
}
