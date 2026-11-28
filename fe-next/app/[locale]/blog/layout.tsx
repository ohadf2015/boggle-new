import { loadTranslation, type TranslationData } from '@/translations/loadTranslation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (['en','he','sv','ja','es','ru'].includes(locale) ? locale : 'en') as Locale;
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const enT = await loadTranslation('en') as Record<string, any>;
  const seo = t?.seo?.blog || enT.seo.blog;
  const baseSeo = t?.seo || enT.seo;

  const localePath = `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/blog`,
      title: seo.ogTitle,
      description: seo.ogDescription,
      siteName: 'LexiClash',
      images: [
        {
          url: 'https://www.lexiclash.live/og-image.jpg?v=2',
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
      images: ['https://www.lexiclash.live/og-image.jpg?v=2'],
    },
    alternates: {
      canonical: `https://www.lexiclash.live${localePath}/blog`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/blog',
        he: 'https://www.lexiclash.live/he/blog',
        en: 'https://www.lexiclash.live/en/blog',
        sv: 'https://www.lexiclash.live/sv/blog',
        ja: 'https://www.lexiclash.live/ja/blog',
        es: 'https://www.lexiclash.live/es/blog',
        ru: 'https://www.lexiclash.live/ru/blog',
        'en-IL': 'https://www.lexiclash.live/en/blog',
        'he-IL': 'https://www.lexiclash.live/he/blog',
        'en-US': 'https://www.lexiclash.live/en/blog',
        'es-US': 'https://www.lexiclash.live/es/blog',
        'en-GB': 'https://www.lexiclash.live/en/blog',
        'en-SE': 'https://www.lexiclash.live/en/blog',
        'sv-SE': 'https://www.lexiclash.live/sv/blog',
        'en-JP': 'https://www.lexiclash.live/en/blog',
        'ja-JP': 'https://www.lexiclash.live/ja/blog',
        'en-ES': 'https://www.lexiclash.live/en/blog',
        'es-ES': 'https://www.lexiclash.live/es/blog',
        'en-MX': 'https://www.lexiclash.live/en/blog',
        'es-MX': 'https://www.lexiclash.live/es/blog',
        'en-AU': 'https://www.lexiclash.live/en/blog',
        'es-AR': 'https://www.lexiclash.live/es/blog',
        'es-CO': 'https://www.lexiclash.live/es/blog',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface BlogLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

// The index page emits its own Blog + BreadcrumbList schema and each post its own
// BlogPosting + BreadcrumbList. Schema here used to repeat on every post: a second,
// shorter breadcrumb and a hand-kept list of every article.
export default function BlogLayout({ children }: BlogLayoutProps): ReactNode {
  return children;
}
