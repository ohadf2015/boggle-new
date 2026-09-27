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
  const seo = t?.seo?.privacy || enT.seo.privacy;
  const baseSeo = t?.seo || enT.seo;

  // Always use explicit locale path for SEO consistency
  const localePath = `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/legal/privacy`,
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
      canonical: `https://www.lexiclash.live${localePath}/legal/privacy`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/legal/privacy',
        he: 'https://www.lexiclash.live/he/legal/privacy',
        en: 'https://www.lexiclash.live/en/legal/privacy',
        sv: 'https://www.lexiclash.live/sv/legal/privacy',
        ja: 'https://www.lexiclash.live/ja/legal/privacy',
        es: 'https://www.lexiclash.live/es/legal/privacy',
        ru: 'https://www.lexiclash.live/ru/legal/privacy',
        'en-IL': 'https://www.lexiclash.live/en/legal/privacy',
        'he-IL': 'https://www.lexiclash.live/he/legal/privacy',
        'en-US': 'https://www.lexiclash.live/en/legal/privacy',
        'es-US': 'https://www.lexiclash.live/es/legal/privacy',
        'en-GB': 'https://www.lexiclash.live/en/legal/privacy',
        'en-SE': 'https://www.lexiclash.live/en/legal/privacy',
        'sv-SE': 'https://www.lexiclash.live/sv/legal/privacy',
        'en-JP': 'https://www.lexiclash.live/en/legal/privacy',
        'ja-JP': 'https://www.lexiclash.live/ja/legal/privacy',
        'en-ES': 'https://www.lexiclash.live/en/legal/privacy',
        'es-ES': 'https://www.lexiclash.live/es/legal/privacy',
        'en-MX': 'https://www.lexiclash.live/en/legal/privacy',
        'es-MX': 'https://www.lexiclash.live/es/legal/privacy',
        'en-AU': 'https://www.lexiclash.live/en/legal/privacy',
        'es-AR': 'https://www.lexiclash.live/es/legal/privacy',
        'es-CO': 'https://www.lexiclash.live/es/legal/privacy',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface PrivacyLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function PrivacyLayout({ children, params }: PrivacyLayoutProps): Promise<ReactNode> {
  const { locale } = await params;
  // Always use explicit locale path for SEO consistency
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
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Privacy Policy',
        item: `https://www.lexiclash.live${localePath}/legal/privacy`,
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
