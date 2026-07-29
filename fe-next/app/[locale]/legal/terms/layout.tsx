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
  const seo = t?.seo?.terms || enT.seo.terms;
  const baseSeo = t?.seo || enT.seo;

  // Always use explicit locale path for SEO consistency
  const localePath = `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/legal/terms`,
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
      canonical: `https://www.lexiclash.live${localePath}/legal/terms`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/legal/terms',
        he: 'https://www.lexiclash.live/he/legal/terms',
        en: 'https://www.lexiclash.live/en/legal/terms',
        sv: 'https://www.lexiclash.live/sv/legal/terms',
        ja: 'https://www.lexiclash.live/ja/legal/terms',
        es: 'https://www.lexiclash.live/es/legal/terms',
        'en-IL': 'https://www.lexiclash.live/en/legal/terms',
        'he-IL': 'https://www.lexiclash.live/he/legal/terms',
        'en-US': 'https://www.lexiclash.live/en/legal/terms',
        'es-US': 'https://www.lexiclash.live/es/legal/terms',
        'en-GB': 'https://www.lexiclash.live/en/legal/terms',
        'en-SE': 'https://www.lexiclash.live/en/legal/terms',
        'sv-SE': 'https://www.lexiclash.live/sv/legal/terms',
        'en-JP': 'https://www.lexiclash.live/en/legal/terms',
        'ja-JP': 'https://www.lexiclash.live/ja/legal/terms',
        'en-ES': 'https://www.lexiclash.live/en/legal/terms',
        'es-ES': 'https://www.lexiclash.live/es/legal/terms',
        'en-MX': 'https://www.lexiclash.live/en/legal/terms',
        'es-MX': 'https://www.lexiclash.live/es/legal/terms',
        'en-AU': 'https://www.lexiclash.live/en/legal/terms',
        'es-AR': 'https://www.lexiclash.live/es/legal/terms',
        'es-CO': 'https://www.lexiclash.live/es/legal/terms',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface TermsLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function TermsLayout({ children, params }: TermsLayoutProps): Promise<ReactNode> {
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
        name: 'Terms of Service',
        item: `https://www.lexiclash.live${localePath}/legal/terms`,
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
