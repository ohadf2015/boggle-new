import { loadTranslation } from '@/translations/loadTranslation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import AdventureProviderWrapper from './AdventureProviderWrapper';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

const EN_ADVENTURE_SEO = {
  title: 'Word Adventure Game - RPG Word Puzzle Free',
  description:
    'Embark on an epic word adventure! Battle bosses, conquer 100 levels across 10 themed worlds. Free RPG word puzzle game with special tiles, power-ups, and progression. No download needed.',
  ogTitle: 'Word Adventure Game - RPG Word Puzzle Free | LexiClash',
  ogDescription:
    'Battle bosses and conquer 100 levels in LexiClash Adventure! Free RPG word puzzle with special tiles, power-ups, and epic progression. No download needed.',
};

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (['en','he','sv','ja','es'].includes(locale) ? locale : 'en') as Locale;
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const enT = await loadTranslation('en') as Record<string, any>;
  const localeSeo = (t?.seo as Record<string, unknown> | undefined)
    ?.adventure as typeof EN_ADVENTURE_SEO | undefined;
  const seo = localeSeo ?? EN_ADVENTURE_SEO;
  const baseSeo = t?.seo || enT.seo;

  const localePath = `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/adventure`,
      title: seo.ogTitle,
      description: seo.ogDescription,
      siteName: 'LexiClash',
      images: [
        {
          url: 'https://www.lexiclash.live/lexiclash.jpg',
          width: 1200,
          height: 630,
          alt: 'LexiClash - Word Adventure Game',
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
      canonical: `https://www.lexiclash.live${localePath}/adventure`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/adventure',
        he: 'https://www.lexiclash.live/he/adventure',
        en: 'https://www.lexiclash.live/en/adventure',
        sv: 'https://www.lexiclash.live/sv/adventure',
        ja: 'https://www.lexiclash.live/ja/adventure',
        es: 'https://www.lexiclash.live/es/adventure',
        ru: 'https://www.lexiclash.live/ru/adventure',
        'en-IL': 'https://www.lexiclash.live/en/adventure',
        'he-IL': 'https://www.lexiclash.live/he/adventure',
        'en-US': 'https://www.lexiclash.live/en/adventure',
        'es-US': 'https://www.lexiclash.live/es/adventure',
        'en-GB': 'https://www.lexiclash.live/en/adventure',
        'en-SE': 'https://www.lexiclash.live/en/adventure',
        'sv-SE': 'https://www.lexiclash.live/sv/adventure',
        'en-JP': 'https://www.lexiclash.live/en/adventure',
        'ja-JP': 'https://www.lexiclash.live/ja/adventure',
        'en-ES': 'https://www.lexiclash.live/en/adventure',
        'es-ES': 'https://www.lexiclash.live/es/adventure',
        'en-MX': 'https://www.lexiclash.live/en/adventure',
        'es-MX': 'https://www.lexiclash.live/es/adventure',
        'en-AU': 'https://www.lexiclash.live/en/adventure',
        'es-AR': 'https://www.lexiclash.live/es/adventure',
        'es-CO': 'https://www.lexiclash.live/es/adventure',
      },
    },
    // BETA-gated mode — noindex all /adventure/* children too (boss-rush,
    // endless, achievements, skills). Restore index:true at GA.
    robots: {
      index: false,
      follow: true,
    },
  };
}

interface AdventureLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdventureLayout({
  children,
}: AdventureLayoutProps): Promise<ReactNode> {
  return <AdventureProviderWrapper>{children}</AdventureProviderWrapper>;
}
