import { loadTranslation, type TranslationData } from '@/translations/loadTranslation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Global Leaderboard - Top Word Game Players Worldwide',
    description: 'See where you rank among the best word game players worldwide. Compete in LexiClash multiplayer matches and daily challenges to climb the rankings.',
    features: [
      'Live-updating global rankings with real-time scores',
      'All-time leaderboard tracking total scores across all games',
      'Mode-specific filters: Classic, Blast, Word Hunt, and Daily Challenge each have dedicated ranks',
      'See your rank position and progress over time',
      'Compare scores with friends and top players worldwide',
      'Separate creator leaderboard for community content makers',
    ],
    faq: [
      { question: 'How are leaderboard rankings calculated?', answer: 'Rankings are based on total score accumulated across all multiplayer games. Higher word scores, longer words, and bonus achievements contribute to your total.' },
      { question: 'How often does the leaderboard update?', answer: 'The leaderboard updates in real-time. Your score changes are reflected immediately after each game finishes.' },
      { question: 'Do I need an account to appear on the leaderboard?', answer: 'Yes — your score is saved once you create a free account. Guest plays count toward your session score but do not persist to the global ranking.' },
      { question: 'Are there separate daily and all-time rankings?', answer: 'Yes. Daily rankings reset at midnight UTC so you can compete fresh each day. All-time rankings track your career total across every game you have ever played.' },
    ],
  },
  he: {
    // AI-drafted — needs native Hebrew review
    title: 'טבלת מובילים עולמית - השחקנים הטובים ביותר במשחקי מילים',
    description: 'ראו איפה אתם מדורגים בין שחקני משחקי המילים הטובים בעולם. התחרו במשחקים ואתגרים יומיים כדי לטפס בדירוגים.',
    features: [
      'דירוגים עולמיים מתעדכנים בזמן אמת',
      'מעקב אחרי ניקוד כולל לאורך כל המשחקים',
      'פילטרים לפי מצב: קלאסי, בלאסט, ציד מילים ואתגר יומי',
      'לשוניות נפרדות לדירוגים יומיים ולכל הזמנים',
      'השוו ניקוד עם חברים ושחקנים מובילים',
    ],
    faq: [
      { question: 'האם אני צריך חשבון כדי להופיע בטבלה?', answer: 'כן — הניקוד שלכם נשמר לאחר יצירת חשבון חינמי. משחקים של אורח לא נרשמים בדירוג העולמי.' },
      { question: 'כמה פעמים הטבלה מתעדכנת?', answer: 'הטבלה מתעדכנת בזמן אמת כאשר משחקים מסתיימים. הדירוגים היומיים מתאפסים בחצות UTC.' },
    ],
  },
  ja: {
    // AI-drafted — needs native Japanese review
    title: 'グローバルリーダーボード - トップワードゲームプレイヤー世界ランキング',
    description: '世界中のワードゲームプレイヤーの中であなたの順位を確認しましょう。毎日の挑戦やマルチプレイヤー対戦でランキングを上げてみてください。',
    features: [
      'リアルタイム更新のグローバルランキング',
      '全ゲームの累計スコア追跡',
      'クラシック、ブラスト、ワードハント、デイリーチャレンジのモード別フィルター',
      'デイリーとオールタイムの別タブでランキングを確認',
      '各ゲーム終了後すぐにランキングが反映',
    ],
    faq: [
      { question: 'ランキングのスコアはどう計算されますか？', answer: 'ランキングはすべてのマルチプレイヤーゲームの合計スコアに基づきます。単語の長さ、コンボ倍率、ボーナスタイルがポイントに加算されます。' },
      { question: 'ランキングに載るにはアカウントが必要ですか？', answer: 'はい。無料アカウントを作成するとスコアが保存されます。ゲストプレイはグローバルランキングには反映されません。' },
    ],
  },
  sv: {
    // AI-drafted — needs native Swedish review
    title: 'Global Topplista - Världens Bästa Ordspelare & Rankningar',
    description: 'Se var du rankas bland världens bästa ordspelare. Tävla i LexiClash multiplayer-matcher och dagliga utmaningar för att klättra i rankingen.',
    features: [
      'Realtidsuppdaterade globala rankningar',
      'All-time-topplista som spårar totalpoäng över alla spel',
      'Modspecifika filter: Klassiskt, Blast, Word Hunt och Daglig Utmaning',
      'Separata flikar för dagliga och all-time-rankningar',
      'Se din rankposition och jämför poäng med vänner världen över',
    ],
    faq: [
      { question: 'Hur beräknas topplistan?', answer: 'Rankningar baseras på din totalpoäng i alla multiplayer-spel. Poäng kommer från ordlängd, kombomultiplikatorer och bonusplattor.' },
      { question: 'Behöver jag ett konto för att synas på topplistan?', answer: 'Ja — din poäng sparas när du skapar ett gratis konto. Gästspel räknas inte mot det globala rankingsystemet.' },
    ],
  },
  es: {
    // AI-drafted — needs native Spanish review
    title: 'Tabla de Clasificación Global - Mejores Jugadores de Palabras',
    description: 'Descubre tu posición entre los mejores jugadores de juegos de palabras del mundo. Compite en partidas multijugador y desafíos diarios para subir en el ranking.',
    features: [
      'Rankings globales actualizados en tiempo real',
      'Tabla de todos los tiempos con puntuación total acumulada',
      'Filtros por modo: Clásico, Blast, Word Hunt y Desafío Diario con rankings independientes',
      'Pestañas separadas para rankings diarios y de todos los tiempos',
      'Sin registro, sin descarga — juega y aparece en el ranking de inmediato',
    ],
    faq: [
      { question: '¿Cómo se calcula la puntuación de la tabla?', answer: 'Los rankings se basan en tu puntuación total en todos los juegos multijugador. Los puntos provienen de la longitud de las palabras, multiplicadores de combo y fichas de bonificación.' },
      { question: '¿Necesito una cuenta para aparecer en la tabla?', answer: 'Sí — tu puntuación se guarda al crear una cuenta gratuita. Los juegos de invitado no se registran en el ranking global.' },
    ],
  },
  ru: {
    title: 'Глобальная таблица лидеров - Топ-игроки в словесные игры во всём мире',
    description: 'Посмотрите, где вы занимаете место среди лучших игроков в словесные игры во всём мире. Участвуйте в многопользовательских матчах LexiClash и ежедневных вызовах, чтобы подняться в рейтинге.',
    features: ['Глобальные рейтинги, обновляющиеся в реальном времени', 'Отслеживание таблицы лидеров всё время с общими баллами во всех играх'],
    faq: [],
  },
};

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale as Locale) || 'en';
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const enT = await loadTranslation('en') as Record<string, any>;
  const seo = t?.seo?.leaderboard || enT.seo.leaderboard;
  const baseSeo = t?.seo || enT.seo;

  // Always use explicit locale path for SEO consistency
  const localePath = `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/leaderboard`,
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
      canonical: `https://www.lexiclash.live${localePath}/leaderboard`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/leaderboard',
        he: 'https://www.lexiclash.live/he/leaderboard',
        en: 'https://www.lexiclash.live/en/leaderboard',
        sv: 'https://www.lexiclash.live/sv/leaderboard',
        ja: 'https://www.lexiclash.live/ja/leaderboard',
        es: 'https://www.lexiclash.live/es/leaderboard',
        'en-IL': 'https://www.lexiclash.live/en/leaderboard',
        'he-IL': 'https://www.lexiclash.live/he/leaderboard',
        'en-US': 'https://www.lexiclash.live/en/leaderboard',
        'es-US': 'https://www.lexiclash.live/es/leaderboard',
        'en-GB': 'https://www.lexiclash.live/en/leaderboard',
        'en-SE': 'https://www.lexiclash.live/en/leaderboard',
        'sv-SE': 'https://www.lexiclash.live/sv/leaderboard',
        'en-JP': 'https://www.lexiclash.live/en/leaderboard',
        'ja-JP': 'https://www.lexiclash.live/ja/leaderboard',
        'en-ES': 'https://www.lexiclash.live/en/leaderboard',
        'es-ES': 'https://www.lexiclash.live/es/leaderboard',
        'en-MX': 'https://www.lexiclash.live/en/leaderboard',
        'es-MX': 'https://www.lexiclash.live/es/leaderboard',
        'en-AU': 'https://www.lexiclash.live/en/leaderboard',
        'es-AR': 'https://www.lexiclash.live/es/leaderboard',
        'es-CO': 'https://www.lexiclash.live/es/leaderboard',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface LeaderboardLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LeaderboardLayout({ children, params }: LeaderboardLayoutProps): Promise<ReactNode> {
  const { locale } = await params;
  // Always use explicit locale path for SEO consistency
  const localePath = `/${locale}`;

  // Breadcrumb structured data - shows page hierarchy for search engines
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `https://www.lexiclash.live${localePath}/leaderboard#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'LexiClash',
        item: `https://www.lexiclash.live${localePath}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Leaderboard',
        item: `https://www.lexiclash.live${localePath}/leaderboard`,
      },
    ],
  };

  // WebPage schema - identifies this page as subordinate to the main site
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `https://www.lexiclash.live${localePath}/leaderboard#webpage`,
    url: `https://www.lexiclash.live${localePath}/leaderboard`,
    name: 'Leaderboard - LexiClash',
    description: 'View the top LexiClash players and their scores. See where you rank among word game champions.',
    isPartOf: {
      '@id': 'https://www.lexiclash.live/#website',
    },
    breadcrumb: {
      '@id': `https://www.lexiclash.live${localePath}/leaderboard#breadcrumb`,
    },
    about: {
      '@id': 'https://www.lexiclash.live/#webapp',
    },
  };

  // ItemList schema - indicates this is a ranked list of items (players)
  // This can help with rich snippets showing leaderboard rankings
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `https://www.lexiclash.live${localePath}/leaderboard#itemlist`,
    name: 'LexiClash Global Leaderboard',
    description: 'Top-ranked players in LexiClash multiplayer word game. Rankings based on total score, wins, and achievements.',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: 100,
    itemListElement: [
      // Placeholder items to indicate structure - actual data is dynamic
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Top Player',
        description: 'Highest ranked player in LexiClash',
      },
    ],
  };

  // CollectionPage schema - indicates this is a collection/gallery of items
  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `https://www.lexiclash.live${localePath}/leaderboard#collectionpage`,
    name: 'LexiClash Global Leaderboard',
    description: 'View the top-ranked word game players worldwide. Track your progress and compete for the top spot.',
    url: `https://www.lexiclash.live${localePath}/leaderboard`,
    mainEntity: {
      '@id': `https://www.lexiclash.live${localePath}/leaderboard#itemlist`,
    },
    isPartOf: {
      '@id': 'https://www.lexiclash.live/#website',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbSchema, webPageSchema, itemListSchema, collectionPageSchema]) }}
      />
      {children}
      <GamePageSeoContent
        title={seoContent[locale as keyof typeof seoContent]?.title || seoContent.en.title}
        description={seoContent[locale as keyof typeof seoContent]?.description || seoContent.en.description}
        features={seoContent[locale as keyof typeof seoContent]?.features || seoContent.en.features}
        faq={seoContent[locale as keyof typeof seoContent]?.faq || seoContent.en.faq}
      />
    </>
  );
}
