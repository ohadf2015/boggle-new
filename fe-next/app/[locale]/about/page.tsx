import type { Metadata } from 'next';
import AboutPageClient from './PageClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const titleMap: Record<string, string> = {
  en: 'About LexiClash - Our Story, Mission & Team',
  he: 'אודות לקסיקלאש - הסיפור, המשימה והצוות שלנו',
  sv: 'Om LexiClash - Vårt Uppdrag, Berättelse & Team',
  ja: 'LexiClashについて - ミッション、ストーリーとチーム',
  es: 'Sobre LexiClash - Nuestra Historia, Mision y Equipo',
};

const descriptionMap: Record<string, string> = {
  en: 'Learn about LexiClash, the free multiplayer word game. Meet the team behind the game, our mission to make word games accessible to everyone, and our values.',
  he: 'למדו על לקסיקלאש, משחק המילים המרובה משתתפים החינמי. הכירו את הצוות, המשימה שלנו והערכים שלנו.',
  sv: 'Lar dig om LexiClash, det gratis multiplayer-ordspelet. Mott teamet, vart uppdrag och vara varden.',
  ja: 'LexiClashについて学ぶ。無料マルチプレイヤーワードゲームのチーム、ミッション、価値観をご紹介します。',
  es: 'Conoce LexiClash, el juego de palabras multijugador gratuito. Conoce al equipo, nuestra mision y valores.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: titleMap[locale] || titleMap.en,
    description: descriptionMap[locale] || descriptionMap.en,
    alternates: {
      canonical: `https://www.lexiclash.live/${locale}/about`,
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
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;

  // All schema content below is hardcoded constants — no user input, safe for JSON serialization
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `https://www.lexiclash.live/${locale}` },
        { '@type': 'ListItem', position: 2, name: 'About', item: `https://www.lexiclash.live/${locale}/about` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://www.lexiclash.live/#organization',
      name: 'LexiClash',
      alternateName: ['LexiClash Ltd', 'לקסיקלאש'],
      url: 'https://www.lexiclash.live',
      logo: { '@type': 'ImageObject', url: 'https://www.lexiclash.live/icon-192.png', width: 192, height: 192 },
      image: 'https://www.lexiclash.live/og-image-en.webp',
      description: descriptionMap[locale] || descriptionMap.en,
      foundingDate: '2024',
      foundingLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressCountry: 'IL' } },
      areaServed: 'Worldwide',
      knowsLanguage: ['en', 'he', 'sv', 'ja', 'es'],
      slogan: 'Real-Time Multiplayer Word Battles',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        url: `https://www.lexiclash.live/${locale}/contact`,
        availableLanguage: ['English', 'Hebrew', 'Swedish', 'Japanese', 'Spanish'],
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      '@id': `https://www.lexiclash.live/${locale}/about#webpage`,
      url: `https://www.lexiclash.live/${locale}/about`,
      name: titleMap[locale] || titleMap.en,
      description: descriptionMap[locale] || descriptionMap.en,
      isPartOf: { '@id': 'https://www.lexiclash.live/#website' },
      about: { '@id': 'https://www.lexiclash.live/#organization' },
    },
  ];

  // Safe: schemas built from static constants above, no user-supplied data
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />
      <AboutPageClient />
    </>
  );
}
