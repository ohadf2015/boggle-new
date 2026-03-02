import type { Metadata } from 'next';
import AboutPageClient from './PageClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const titleMap: Record<string, string> = {
  en: 'About LexiClash - Our Mission & Team | LexiClash',
  he: 'אודות לקסיקלאש - המשימה והצוות שלנו',
  sv: 'Om LexiClash - Vårt Uppdrag & Team',
  ja: 'LexiClashについて - 私たちのミッションとチーム',
  es: 'Sobre LexiClash - Nuestra Mision y Equipo',
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
      },
    },
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;

  // BreadcrumbList schema — hardcoded (no user input), safe for JSON injection
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `https://www.lexiclash.live/${locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'About',
        item: `https://www.lexiclash.live/${locale}/about`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <AboutPageClient />
    </>
  );
}
