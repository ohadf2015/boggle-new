import { translations } from '@/translations';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

type Locale = 'en' | 'he' | 'sv' | 'ja';

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale as Locale) || 'en';
  const seo = translations[validLocale]?.seo?.profile || translations.en.seo.profile;
  const baseSeo = translations[validLocale]?.seo || translations.en.seo;

  const localePath = locale === 'he' ? '' : `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/profile`,
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
      canonical: `https://www.lexiclash.live${localePath}/profile`,
      languages: {
        'x-default': 'https://www.lexiclash.live/profile',
        he: 'https://www.lexiclash.live/he/profile',
        en: 'https://www.lexiclash.live/en/profile',
        sv: 'https://www.lexiclash.live/sv/profile',
        ja: 'https://www.lexiclash.live/ja/profile',
      },
    },
  };
}

interface ProfileLayoutProps {
  children: ReactNode;
}

export default function ProfileLayout({ children }: ProfileLayoutProps): ReactNode {
  return children;
}
