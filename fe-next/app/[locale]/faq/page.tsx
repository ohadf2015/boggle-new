import FAQPageClient from './PageClient';
import { loadTranslation } from '@/translations/loadTranslation';
import { contentByLocale } from './content';

export const revalidate = 86400;
import type { Metadata } from 'next';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import { GuidesCalloutLink } from '@/components/seo/GuidesCalloutLink';

function buildFaqJsonLd(locale: string): string {
  const data = contentByLocale[locale] ?? contentByLocale.en;
  const url = `https://www.lexiclash.live/${locale}/faq`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    inLanguage: locale,
    url,
    mainEntity: data.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
  return JSON.stringify(schema);
}

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface PageParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (['en','he','sv','ja','es','ru'].includes(locale) ? locale : 'en') as Locale;
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const enT = await loadTranslation('en') as Record<string, any>;
  const seo = t?.seo?.faq || enT.seo.faq;
  const baseSeo = t?.seo || enT.seo;

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

const faqSeoContent: Record<string, {
  title: string;
  description: string;
  features: string[];
  faq: { question: string; answer: string }[];
}> = {
  en: {
    title: 'Frequently Asked Questions — LexiClash Help Center',
    description:
      'Find answers to the most common questions about LexiClash. Learn about game modes, scoring, accounts, multiplayer, and more. Our FAQ covers everything from getting started to advanced strategies.',
    features: [
      'Comprehensive answers about Classic, Blast, Word Hunt, and Adventure modes',
      'Account setup, profile customization, and streak tracking explained',
      'Multiplayer and Party TV room creation, joining, and host controls',
      'Scoring system breakdown — word length, combos, bonus tiles, and multipliers',
      'Language support details — play in English, Hebrew, Swedish, Japanese, or Spanish',
    ],
    faq: [
      {
        question: 'What is LexiClash?',
        answer:
          'LexiClash is a free, real-time multiplayer word game. Find words on a letter grid, compete against friends or strangers, and climb the leaderboard. Available in 5 languages with multiple game modes.',
      },
      {
        question: 'How do I start a multiplayer game?',
        answer:
          'Click "Create Room" from the main menu, choose your game mode and settings, then share the room code with friends. They enter the code to join. You can also join random public rooms.',
      },
      {
        question: 'Is LexiClash free to play?',
        answer:
          'Yes — LexiClash is completely free. All game modes, daily challenges, and multiplayer features are available without payment or ads blocking gameplay.',
      },
    ],
  },
  he: {
    title: 'שאלות נפוצות — מרכז העזרה של LexiClash',
    description:
      'מצאו תשובות לשאלות הנפוצות ביותר על LexiClash. למדו על מצבי משחק, ניקוד, חשבונות ומשחק מרובה משתתפים.',
    features: [
      'תשובות מקיפות על מצבי קלאסי, בלאסט, ציד מילים והרפתקה',
      'הגדרת חשבון, התאמה אישית של פרופיל ומעקב רצפים',
      'יצירת חדרי מרובי משתתפים והצטרפות אליהם',
    ],
    faq: [
      {
        question: 'מה זה LexiClash?',
        answer: 'LexiClash הוא משחק מילים מרובה משתתפים חינמי בזמן אמת. מצאו מילים על לוח אותיות, התחרו מול חברים וטפסו בטבלת המובילים.',
      },
    ],
  },
  sv: {
    title: 'Vanliga Frågor — LexiClash Hjälpcenter',
    description:
      'Hitta svar på de vanligaste frågorna om LexiClash. Lär dig om spellägen, poängsättning, konton och multiplayer.',
    features: [
      'Omfattande svar om Klassiskt, Blast, Word Hunt och Äventyrslägen',
      'Kontoinställning, profilanpassning och streak-spårning förklarad',
      'Multiplayer-rumsskapande och värdkontroller',
    ],
    faq: [
      {
        question: 'Vad är LexiClash?',
        answer: 'LexiClash är ett gratis multiplayer-ordspel i realtid. Hitta ord på ett bokstavsrutnät, tävla mot vänner och klättra på topplistan.',
      },
    ],
  },
  ja: {
    title: 'よくある質問 — LexiClash ヘルプセンター',
    description:
      'LexiClashについてよくある質問への回答。ゲームモード、スコアリング、アカウント、マルチプレイヤーについて学びましょう。',
    features: [
      'クラシック、ブラスト、ワードハント、アドベンチャーモードの総合回答',
      'アカウント設定、プロフィールカスタマイズ、連続記録の説明',
      'マルチプレイヤールームの作成と参加方法',
    ],
    faq: [
      {
        question: 'LexiClashとは？',
        answer: 'LexiClashは無料のリアルタイムマルチプレイヤーワードゲームです。レターグリッドで単語を見つけ、友達と競い、リーダーボードを上がりましょう。',
      },
    ],
  },
  es: {
    title: 'Preguntas Frecuentes — Centro de Ayuda LexiClash',
    description:
      'Encuentra respuestas a las preguntas más comunes sobre LexiClash. Aprende sobre modos de juego, puntuación, cuentas y multijugador.',
    features: [
      'Respuestas completas sobre los modos Clásico, Blast, Word Hunt y Aventura',
      'Configuración de cuenta, personalización de perfil y seguimiento de rachas',
      'Creación de salas multijugador y controles de anfitrión',
      'Desglose del sistema de puntuación — longitud de palabras, combos y multiplicadores',
    ],
    faq: [
      {
        question: '¿Qué es LexiClash?',
        answer: 'LexiClash es un juego de palabras multijugador gratuito en tiempo real. Encuentra palabras en una cuadrícula de letras, compite contra amigos y sube en la tabla de clasificación.',
      },
      {
        question: '¿Es LexiClash gratis?',
        answer: 'Sí — LexiClash es completamente gratis. Todos los modos de juego, desafíos diarios y funciones multijugador están disponibles sin pago.',
      },
    ],
  },
};

export default async function FAQPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = faqSeoContent[locale] ?? faqSeoContent.en;
  const faqJsonLd = buildFaqJsonLd(locale);
  return (
    <>
      <script type="application/ld+json">{faqJsonLd}</script>
      <FAQPageClient />
      <GuidesCalloutLink locale={locale} />
      <GamePageSeoContent
        title={content.title}
        description={content.description}
        features={content.features}
        faq={content.faq}
      />
    </>
  );
}
