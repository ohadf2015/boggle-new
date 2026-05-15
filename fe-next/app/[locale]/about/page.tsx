import type { Metadata } from 'next';
import AboutPageClient from './PageClient';

export const revalidate = 86400;
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';

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
  const title = titleMap[locale] || titleMap.en;
  const description = descriptionMap[locale] || descriptionMap.en;

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url: `https://www.lexiclash.live/${locale}/about`,
      siteName: 'LexiClash',
      images: [{ url: 'https://www.lexiclash.live/og-image-en.webp', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://www.lexiclash.live/og-image-en.webp'],
    },
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
      {(() => {
        const aboutSeoContent: Record<string, {
          title: string; description: string; features: string[];
          faq: { question: string; answer: string }[];
        }> = {
          en: {
            title: 'About LexiClash — Our Story, Mission & Team',
            description: 'LexiClash is a free, real-time multiplayer word game built for players who love language. Founded in 2024, our mission is to make word games accessible, competitive, and fun for everyone — in any language.',
            features: [
              'Free multiplayer word game with no pay-to-win mechanics',
              'Available in 5 languages — English, Hebrew, Swedish, Japanese, and Spanish',
              'Multiple game modes — Classic, Blast, Word Hunt, Adventure, and Daily Challenges',
              'Built for phones, tablets, and Party TV screens',
              'Open to players worldwide with real-time matchmaking',
            ],
            faq: [
              { question: 'Who made LexiClash?', answer: 'LexiClash was created by a small team passionate about word games and language learning. We are based in Israel and serve players worldwide.' },
              { question: 'Is LexiClash free?', answer: 'Yes — LexiClash is completely free to play. All game modes, daily challenges, and multiplayer features are available without payment.' },
              { question: 'How can I contact the LexiClash team?', answer: 'Visit our Contact page to reach us with feedback, bug reports, partnership inquiries, or any questions.' },
            ],
          },
          he: {
            title: 'אודות LexiClash — הסיפור, המשימה והצוות שלנו',
            description: 'LexiClash הוא משחק מילים מרובה משתתפים חינמי בזמן אמת. הוקם ב-2024 עם המטרה להנגיש משחקי מילים לכולם.',
            features: ['משחק מילים מרובה משתתפים חינמי', 'זמין ב-5 שפות', 'מצבי משחק מגוונים — קלאסי, בלאסט, ציד מילים, הרפתקה ואתגרים יומיים'],
            faq: [{ question: 'מי יצר את LexiClash?', answer: 'LexiClash נוצר על ידי צוות קטן שנלהב ממשחקי מילים ולמידת שפות. אנחנו מבוססים בישראל ומשרתים שחקנים ברחבי העולם.' }],
          },
          sv: {
            title: 'Om LexiClash — Vårt Uppdrag, Berättelse & Team',
            description: 'LexiClash är ett gratis multiplayer-ordspel i realtid. Grundat 2024 med uppdraget att göra ordspel tillgängliga för alla.',
            features: ['Gratis multiplayer-ordspel utan annonser', 'Tillgängligt på 5 språk', 'Flera spellägen — Klassiskt, Blast, Word Hunt och mer'],
            faq: [{ question: 'Vem skapade LexiClash?', answer: 'LexiClash skapades av ett litet team som brinner för ordspel. Vi är baserade i Israel och betjänar spelare världen över.' }],
          },
          ja: {
            title: 'LexiClashについて — ミッション、ストーリーとチーム',
            description: 'LexiClashは無料のリアルタイムマルチプレイヤーワードゲーム。2024年設立、すべての人にワードゲームを届けることが使命です。',
            features: ['広告なしの無料マルチプレイヤーワードゲーム', '5言語対応', '複数のゲームモード — クラシック、ブラスト、ワードハントなど'],
            faq: [{ question: 'LexiClashを作ったのは？', answer: 'LexiClashはワードゲームと言語学習に情熱を持つ小さなチームが作りました。イスラエルを拠点に世界中のプレイヤーにサービスを提供しています。' }],
          },
          es: {
            title: 'Sobre LexiClash — Nuestra Historia, Misión y Equipo',
            description: 'LexiClash es un juego de palabras multijugador gratuito en tiempo real. Fundado en 2024, nuestra misión es hacer los juegos de palabras accesibles para todos.',
            features: ['Juego de palabras multijugador gratuito sin anuncios', 'Disponible en 5 idiomas', 'Múltiples modos de juego — Clásico, Blast, Word Hunt y más'],
            faq: [
              { question: '¿Quién creó LexiClash?', answer: 'LexiClash fue creado por un equipo apasionado por los juegos de palabras. Estamos basados en Israel y servimos a jugadores de todo el mundo.' },
              { question: '¿Es LexiClash gratis?', answer: 'Sí — LexiClash es completamente gratis. Todos los modos, desafíos diarios y funciones multijugador están disponibles sin pago.' },
            ],
          },
        };
        const aboutData = aboutSeoContent[locale] ?? aboutSeoContent.en;
        return (
          <GamePageSeoContent
            asH1
            title={aboutData.title}
            description={aboutData.description}
            features={aboutData.features}
            faq={aboutData.faq}
          />
        );
      })()}
    </>
  );
}
