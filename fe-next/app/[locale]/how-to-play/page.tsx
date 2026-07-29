import HowToPlayPageClient from './PageClient';
import { getHowToPlayContent } from './content';
import { loadTranslation, type TranslationData } from '@/translations/loadTranslation';
import type { Metadata } from 'next';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import { GuidesCalloutLink } from '@/components/seo/GuidesCalloutLink';

export const dynamic = 'force-dynamic';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface PageParams {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
    const { locale } = await params;
    const validLocale = (['en','he','sv','ja','es'].includes(locale) ? locale : 'en') as Locale;
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const enT = await loadTranslation('en') as Record<string, any>;
    const pageContent = getHowToPlayContent(validLocale);
    const baseSeo = t?.seo || enT.seo;

    return {
        title: pageContent.pageTitle,
        description: pageContent.pageDescription,
        openGraph: {
            type: 'website',
            locale: baseSeo.locale,
            url: `https://www.lexiclash.live/${locale}/how-to-play`,
            title: pageContent.pageTitle,
            description: pageContent.pageDescription,
            siteName: 'LexiClash',
            images: [
                {
                    url: 'https://www.lexiclash.live/og-image-en.webp',
                    width: 1200,
                    height: 630,
                    alt: 'LexiClash - How to Play',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: pageContent.pageTitle,
            description: pageContent.pageDescription,
            images: ['https://www.lexiclash.live/og-image-en.webp'],
        },
        alternates: {
            canonical: `https://www.lexiclash.live/${locale}/how-to-play`,
            languages: {
                'x-default': 'https://www.lexiclash.live/en/how-to-play',
                he: 'https://www.lexiclash.live/he/how-to-play',
                en: 'https://www.lexiclash.live/en/how-to-play',
                sv: 'https://www.lexiclash.live/sv/how-to-play',
                ja: 'https://www.lexiclash.live/ja/how-to-play',
                es: 'https://www.lexiclash.live/es/how-to-play',
                'en-IL': 'https://www.lexiclash.live/en/how-to-play',
                'he-IL': 'https://www.lexiclash.live/he/how-to-play',
                'en-US': 'https://www.lexiclash.live/en/how-to-play',
                'es-US': 'https://www.lexiclash.live/es/how-to-play',
                'en-GB': 'https://www.lexiclash.live/en/how-to-play',
                'en-SE': 'https://www.lexiclash.live/en/how-to-play',
                'sv-SE': 'https://www.lexiclash.live/sv/how-to-play',
                'en-JP': 'https://www.lexiclash.live/en/how-to-play',
                'ja-JP': 'https://www.lexiclash.live/ja/how-to-play',
                'en-ES': 'https://www.lexiclash.live/en/how-to-play',
                'es-ES': 'https://www.lexiclash.live/es/how-to-play',
                'en-MX': 'https://www.lexiclash.live/en/how-to-play',
                'es-MX': 'https://www.lexiclash.live/es/how-to-play',
                'en-AU': 'https://www.lexiclash.live/en/how-to-play',
                'es-AR': 'https://www.lexiclash.live/es/how-to-play',
                'es-CO': 'https://www.lexiclash.live/es/how-to-play',
            },
        },
        robots: { index: true, follow: true },
    };
}

const howToPlaySeoContent: Record<string, {
  title: string;
  description: string;
  features: string[];
  faq: { question: string; answer: string }[];
}> = {
  en: {
    title: 'How to Play LexiClash — Rules, Modes & Scoring Guide',
    description:
      'Learn how to play LexiClash step by step. This guide covers Classic, Blast, and Word Hunt modes with rules, scoring tables, tips, and strategies for beginners and advanced players.',
    features: [
      'Classic mode — find words on a 4x4 or 5x5 grid before time runs out',
      'Blast mode — chain words with combo multipliers for explosive scores',
      'Word Hunt — daily Wordle-like puzzle with color-coded clues and 10 attempts',
      'Scoring guide — points by word length, combo bonuses, and bonus tile multipliers',
      'Multiplayer setup — create rooms, invite friends, and compete in real time',
    ],
    faq: [
      {
        question: 'What are the basic rules of LexiClash?',
        answer:
          'Find words by connecting adjacent letters on the grid. Words must be at least 3 letters long. Each letter tile can only be used once per word. Longer words score more points.',
      },
      {
        question: 'How does scoring work?',
        answer:
          'Points increase with word length: 3 letters = 1 point, 4 letters = 2 points, 5 letters = 4 points, 6 letters = 6 points, 7+ letters = 10+ points. Combo chains and bonus tiles multiply your score.',
      },
      {
        question: 'What is the difference between Classic and Blast mode?',
        answer:
          'Classic mode gives you a set time to find as many words as possible. Blast mode adds combo multipliers — finding words quickly in succession boosts your score exponentially.',
      },
    ],
  },
  he: {
    title: 'איך לשחק ב-LexiClash — חוקים, מצבים ומדריך ניקוד',
    description: 'למדו איך לשחק ב-LexiClash צעד אחר צעד. המדריך מכסה מצבי קלאסי, בלאסט וציד מילים עם חוקים וטיפים.',
    features: [
      'מצב קלאסי — מצאו מילים על לוח 4x4 או 5x5 לפני שהזמן נגמר',
      'מצב בלאסט — שרשרו מילים עם מכפילי קומבו',
      'ציד מילים — פאזל יומי עם רמזי צבע ו-10 ניסיונות',
    ],
    faq: [
      {
        question: 'מהם החוקים הבסיסיים?',
        answer: 'מצאו מילים על ידי חיבור אותיות סמוכות בלוח. מילים חייבות להיות באורך 3 אותיות לפחות. כל אות אפשר להשתמש פעם אחת למילה.',
      },
    ],
  },
  sv: {
    title: 'Hur man spelar LexiClash — Regler, Lägen & Poängguide',
    description: 'Lär dig spela LexiClash steg för steg. Guiden täcker Klassiskt, Blast och Word Hunt med regler och tips.',
    features: [
      'Klassiskt läge — hitta ord på ett 4x4 eller 5x5 rutnät innan tiden tar slut',
      'Blast-läge — kedja ord med kombomultiplikatorer',
      'Word Hunt — dagligt pussel med färgkodade ledtrådar',
    ],
    faq: [
      {
        question: 'Vilka är grundreglerna?',
        answer: 'Hitta ord genom att koppla samman angränsande bokstäver. Ord måste vara minst 3 bokstäver långa. Varje bokstav kan bara användas en gång per ord.',
      },
    ],
  },
  ja: {
    title: 'LexiClashの遊び方 — ルール、モード＆スコアリングガイド',
    description: 'LexiClashの遊び方をステップバイステップで学びましょう。クラシック、ブラスト、ワードハントモードのルールとヒント。',
    features: [
      'クラシックモード — 時間切れ前に4x4または5x5グリッドで単語を見つける',
      'ブラストモード — コンボ倍率で単語をチェーン',
      'ワードハント — 色分けされたヒントで毎日のパズル',
    ],
    faq: [
      {
        question: '基本ルールは？',
        answer: 'グリッド上の隣接する文字をつなげて単語を見つけます。単語は3文字以上必要。各文字は1単語につき1回のみ使用可能。',
      },
    ],
  },
  es: {
    title: 'Cómo Jugar LexiClash — Reglas, Modos y Guía de Puntuación',
    description: 'Aprende a jugar LexiClash paso a paso. Esta guía cubre los modos Clásico, Blast y Word Hunt con reglas y estrategias.',
    features: [
      'Modo Clásico — encuentra palabras en una cuadrícula 4x4 o 5x5 antes de que se acabe el tiempo',
      'Modo Blast — encadena palabras con multiplicadores de combo',
      'Word Hunt — puzzle diario con pistas de colores y 10 intentos',
      'Guía de puntuación — puntos por longitud, bonificaciones de combo y multiplicadores',
    ],
    faq: [
      {
        question: '¿Cuáles son las reglas básicas?',
        answer: 'Encuentra palabras conectando letras adyacentes en la cuadrícula. Las palabras deben tener al menos 3 letras. Cada letra solo se puede usar una vez por palabra.',
      },
      {
        question: '¿Cómo funciona la puntuación?',
        answer: 'Los puntos aumentan con la longitud: 3 letras = 1 punto, 4 letras = 2 puntos, 5 letras = 4 puntos. Los combos y fichas de bonificación multiplican tu puntuación.',
      },
    ],
  },
};

export default async function HowToPlayPage({ params }: PageParams) {
    const { locale } = await params;
    const validLocale = (['en','he','sv','ja','es'].includes(locale) ? locale : 'en') as Locale;
    const content = howToPlaySeoContent[validLocale] ?? howToPlaySeoContent.en;
    return (
      <>
        <HowToPlayPageClient locale={locale} />
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
