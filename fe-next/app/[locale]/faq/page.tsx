import FAQPageClient from './PageClient';
import { translations } from '@/translations';
import type { Metadata } from 'next';

type Locale = keyof typeof translations;

interface PageParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale in translations ? locale : 'en') as Locale;
  const seo = translations[validLocale]?.seo?.faq || translations.en.seo.faq;
  const baseSeo = translations[validLocale]?.seo || translations.en.seo;

  const localePath = `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/faq`,
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
      canonical: `https://www.lexiclash.live${localePath}/faq`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/faq',
        he: 'https://www.lexiclash.live/he/faq',
        en: 'https://www.lexiclash.live/en/faq',
        sv: 'https://www.lexiclash.live/sv/faq',
        ja: 'https://www.lexiclash.live/ja/faq',
        es: 'https://www.lexiclash.live/es/faq',
        'en-IL': 'https://www.lexiclash.live/en/faq',
        'he-IL': 'https://www.lexiclash.live/he/faq',
        'en-US': 'https://www.lexiclash.live/en/faq',
        'es-US': 'https://www.lexiclash.live/es/faq',
        'en-GB': 'https://www.lexiclash.live/en/faq',
        'en-SE': 'https://www.lexiclash.live/en/faq',
        'sv-SE': 'https://www.lexiclash.live/sv/faq',
        'en-JP': 'https://www.lexiclash.live/en/faq',
        'ja-JP': 'https://www.lexiclash.live/ja/faq',
        'en-ES': 'https://www.lexiclash.live/en/faq',
        'es-ES': 'https://www.lexiclash.live/es/faq',
        'en-MX': 'https://www.lexiclash.live/en/faq',
        'es-MX': 'https://www.lexiclash.live/es/faq',
        'en-AU': 'https://www.lexiclash.live/en/faq',
        'es-AR': 'https://www.lexiclash.live/es/faq',
        'es-CO': 'https://www.lexiclash.live/es/faq',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function FAQPage() {
  return <FAQPageClient />;
}
