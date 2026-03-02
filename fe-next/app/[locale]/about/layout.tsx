import { translations } from '@/translations';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

type Locale = keyof typeof translations;

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale in translations ? locale : 'en') as Locale;
  const seo = translations[validLocale]?.seo?.about || translations.en.seo.about;
  const baseSeo = translations[validLocale]?.seo || translations.en.seo;

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
