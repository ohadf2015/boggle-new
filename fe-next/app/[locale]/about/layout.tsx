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
  const seo = t?.seo?.about || enT.seo.about;
  const baseSeo = t?.seo || enT.seo;

  const localePath = `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/about`,
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
      canonical: `https://www.lexiclash.live${localePath}/about`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/about',
        he: 'https://www.lexiclash.live/he/about',
        en: 'https://www.lexiclash.live/en/about',
        sv: 'https://www.lexiclash.live/sv/about',
        ja: 'https://www.lexiclash.live/ja/about',
        es: 'https://www.lexiclash.live/es/about',
        'en-IL': 'https://www.lexiclash.live/en/about',
        'he-IL': 'https://www.lexiclash.live/he/about',
        'en-US': 'https://www.lexiclash.live/en/about',
        'es-US': 'https://www.lexiclash.live/es/about',
        'en-GB': 'https://www.lexiclash.live/en/about',
        'en-SE': 'https://www.lexiclash.live/en/about',
        'sv-SE': 'https://www.lexiclash.live/sv/about',
        'en-JP': 'https://www.lexiclash.live/en/about',
        'ja-JP': 'https://www.lexiclash.live/ja/about',
        'en-ES': 'https://www.lexiclash.live/en/about',
        'es-ES': 'https://www.lexiclash.live/es/about',
        'en-MX': 'https://www.lexiclash.live/en/about',
        'es-MX': 'https://www.lexiclash.live/es/about',
        'en-AU': 'https://www.lexiclash.live/en/about',
        'es-AR': 'https://www.lexiclash.live/es/about',
        'es-CO': 'https://www.lexiclash.live/es/about',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function AboutLayout({ children }: { children: ReactNode }): ReactNode {
  return children;
}
