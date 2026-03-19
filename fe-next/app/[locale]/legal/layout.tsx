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
  const seo = t?.seo?.legal || enT.seo.legal;
  const baseSeo = t?.seo || enT.seo;

  // Always use explicit locale path for consistent canonicals
  const localePath = `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/legal`,
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
      canonical: `https://www.lexiclash.live${localePath}/legal`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/legal',
        he: 'https://www.lexiclash.live/he/legal',
        en: 'https://www.lexiclash.live/en/legal',
        sv: 'https://www.lexiclash.live/sv/legal',
        ja: 'https://www.lexiclash.live/ja/legal',
        es: 'https://www.lexiclash.live/es/legal',
        'en-IL': 'https://www.lexiclash.live/en/legal',
        'he-IL': 'https://www.lexiclash.live/he/legal',
        'en-US': 'https://www.lexiclash.live/en/legal',
        'es-US': 'https://www.lexiclash.live/es/legal',
        'en-GB': 'https://www.lexiclash.live/en/legal',
        'en-SE': 'https://www.lexiclash.live/en/legal',
        'sv-SE': 'https://www.lexiclash.live/sv/legal',
        'en-JP': 'https://www.lexiclash.live/en/legal',
        'ja-JP': 'https://www.lexiclash.live/ja/legal',
        'en-ES': 'https://www.lexiclash.live/en/legal',
        'es-ES': 'https://www.lexiclash.live/es/legal',
        'en-MX': 'https://www.lexiclash.live/en/legal',
        'es-MX': 'https://www.lexiclash.live/es/legal',
        'en-AU': 'https://www.lexiclash.live/en/legal',
        'es-AR': 'https://www.lexiclash.live/es/legal',
        'es-CO': 'https://www.lexiclash.live/es/legal',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface LegalLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LegalLayout({ children, params }: LegalLayoutProps): Promise<ReactNode> {
  const { locale } = await params;
  const localePath = `/${locale}`;

  // Breadcrumb structured data
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `https://www.lexiclash.live${localePath}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Legal',
        item: `https://www.lexiclash.live${localePath}/legal`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
