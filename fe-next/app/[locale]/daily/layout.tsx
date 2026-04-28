import { loadTranslation } from '@/translations/loadTranslation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Daily Word Wheel & Word Hunt — Free Daily Word Puzzle | LexiClash',
    description: 'Play today\'s Daily Word Wheel and Word Hunt free — new puzzle every day at midnight UTC. Same board worldwide, no download, no signup. Track streaks, share results, climb the global leaderboard.',
    features: [
      'New puzzle every day at midnight UTC',
      'Same board for all players worldwide - fair competition',
      'Share emoji results with friends, just like Wordle',
      'Word Hunt Survival: find the hidden word in 10 attempts',
      'Word Wheel: find words from a wheel of letters using the center letter',
      'Daily streaks reward consistent play',
      'Global leaderboard resets each day',
    ],
    faq: [
      { question: 'When does the daily puzzle reset?', answer: 'A new puzzle is generated every day at midnight UTC. Your progress resets and a fresh leaderboard begins.' },
      { question: 'Can I share my results?', answer: 'Yes! After completing the puzzle, tap the share button to copy an emoji grid summary. Share it on social media or messaging apps without spoiling the answer.' },
      { question: 'What is Word Hunt Survival?', answer: 'Word Hunt is a daily word search challenge where you have 10 attempts to find the hidden target word on the board. Think of it as Wordle meets Boggle.' },
      { question: 'What is the Daily Word Wheel?', answer: 'The Word Wheel is a daily puzzle where you find words using letters arranged in a wheel. Every word must include the center letter. Longer words earn more points. A new wheel appears every day.' },
    ],
  },
  he: {
    title: 'אתגר מילים יומי - אותו פאזל לכל העולם',
    description: 'פאזל מילים חדש כל יום בחצות UTC. כולם משחקים על אותו לוח. שתפו תוצאות והתחרו בטבלת המובילים היומית.',
    features: [
      'פאזל חדש כל יום בחצות',
      'אותו לוח לכל השחקנים בעולם',
      'שתפו תוצאות אמוג\'י עם חברים',
      'מצא מילה: מצאו את המילה הנסתרת ב-10 ניסיונות',
      'רצפים יומיים מתגמלים משחק עקבי',
    ],
    faq: [
      { question: 'מתי מתאפס האתגר היומי?', answer: 'פאזל חדש נוצר כל יום בחצות UTC. ההתקדמות מתאפסת וטבלת מובילים חדשה מתחילה.' },
    ],
  },
  ja: {
    title: 'ワードハント & デイリーワードホイール — 無料ワードパズル | LexiClash',
    description: 'ワードハントとは？ 毎日新しい単語パズル — デイリーワードホイールとワードハントサバイバルを無料でプレイ。ダウンロード不要、登録不要。全プレイヤー同じ問題で世界ランキングに挑戦。',
    features: [
      '毎日UTC午前0時に新パズル（ワードハント & ワードホイール）',
      'ワードハントとは：隠された単語を10回以内に見つける日替わりパズル',
      '世界中の全プレイヤーが同じボード — 公平な競争',
      'ダウンロード・登録不要、ブラウザで即プレイ',
      '絵文字で結果を友達にシェア',
      '連続プレイでストリーク報酬をゲット',
      'グローバルランキングで毎日競争',
    ],
    faq: [
      { question: 'デイリーパズルはいつリセットされますか？', answer: '毎日UTC午前0時に新しいパズルが生成されます。進捗がリセットされ、新しいランキングが始まります。' },
      { question: '結果をシェアできますか？', answer: 'はい！パズル完了後、シェアボタンで絵文字グリッドをコピーできます。答えをネタバレせずにSNSやメッセージアプリでシェアできます。' },
      { question: 'ワードハントサバイバルとは？', answer: 'ワードハントは毎日のワードサーチチャレンジです。ボード上の隠されたターゲットワードを10回以内に見つけてください。WorldeとBoggleが融合したようなゲームです。' },
      { question: 'アプリのダウンロードは必要ですか？', answer: 'いいえ！ブラウザで直接プレイできます。ダウンロード不要、登録不要。スマホ、タブレット、PCで遊べます。' },
    ],
  },
  sv: {
    title: 'Dagligt Ordhjul & Ordjakt — Gratis Dagligt Ordpussel | LexiClash',
    description: 'Spela dagens Ordhjul och Ordjakt gratis — nytt pussel varje dag. Samma braede foer alla, ingen nedladdning, ingen registrering. Taevla paa den globala dagliga topplistan.',
    features: [
      'Nytt pussel varje dag vid midnatt UTC',
      'Samma braede foer alla spelare vaerldsomspaennande',
      'Ordhjul: hitta ord fraan ett bokstavshjul',
      'Ordjakt: hitta det dolda ordet paa 10 foersoek',
      'Dela emoji-resultat precis som Wordle',
      'Daglig strak belonar regelbundet spel',
    ],
    faq: [
      { question: 'Naer aaterstaells det dagliga pusslet?', answer: 'Ett nytt pussel genereras varje dag vid midnatt UTC. Dina framsteg aaterstaells och en ny topplista boerjar.' },
      { question: 'Kan jag dela mina resultat?', answer: 'Ja! Efter pusslet, tryck paa dela-knappen foer att kopiera en emoji-rutnaet. Dela det paa sociala medier utan att avsloeja svaret.' },
      { question: 'Vad aer Ordhjul?', answer: 'Ordhjulet aer ett dagligt pussel daer du hittar ord med bokstaever arrangerade i ett hjul. Varje ord maaste innehaalla mittenbokstaven. Nytt hjul varje dag.' },
    ],
  },
  es: {
    title: 'Rueda de Palabras & Caza de Palabras Diaria — Puzzle Gratis | LexiClash',
    description: 'Juega la Rueda de Palabras y Caza de Palabras diarias gratis — nuevo puzzle cada dia a medianoche UTC. Mismo tablero mundial, sin descargas ni registro. Compite en el ranking global.',
    features: [
      'Nuevo puzzle cada dia a medianoche UTC',
      'Mismo tablero para todos los jugadores del mundo',
      'Rueda de Palabras: encuentra palabras en una rueda de letras',
      'Caza de Palabras: encuentra la palabra oculta en 10 intentos',
      'Comparte resultados emoji como Wordle',
      'Rachas diarias recompensan el juego constante',
    ],
    faq: [
      { question: 'Cuando se reinicia el puzzle diario?', answer: 'Un nuevo puzzle se genera cada dia a medianoche UTC. Tu progreso se reinicia y un ranking fresco comienza.' },
      { question: 'Puedo compartir mis resultados?', answer: 'Si! Despues del puzzle, toca el boton compartir para copiar una cuadricula emoji. Compartela en redes sociales sin revelar la respuesta.' },
      { question: 'Que es la Rueda de Palabras Diaria?', answer: 'La Rueda de Palabras es un puzzle diario donde encuentras palabras usando letras en una rueda. Cada palabra debe incluir la letra central. Nueva rueda cada dia.' },
    ],
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
  const seo = t?.seo?.daily || enT.seo.daily;
  const baseSeo = t?.seo || enT.seo;

  const localePath = `/${locale}`;

  // NOTE: OG images are handled dynamically in page.tsx based on share params (wh, share)
  // Do NOT add images here or they will override the dynamic images
  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/daily`,
      title: seo.ogTitle,
      description: seo.ogDescription,
      siteName: 'LexiClash',
      // images are set dynamically in page.tsx
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.ogTitle,
      description: seo.ogDescription,
      // images are set dynamically in page.tsx
    },
    alternates: {
      canonical: `https://www.lexiclash.live${localePath}/daily`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/daily',
        he: 'https://www.lexiclash.live/he/daily',
        en: 'https://www.lexiclash.live/en/daily',
        sv: 'https://www.lexiclash.live/sv/daily',
        ja: 'https://www.lexiclash.live/ja/daily',
        es: 'https://www.lexiclash.live/es/daily',
        'en-IL': 'https://www.lexiclash.live/en/daily',
        'he-IL': 'https://www.lexiclash.live/he/daily',
        'en-US': 'https://www.lexiclash.live/en/daily',
        'es-US': 'https://www.lexiclash.live/es/daily',
        'en-GB': 'https://www.lexiclash.live/en/daily',
        'en-SE': 'https://www.lexiclash.live/en/daily',
        'sv-SE': 'https://www.lexiclash.live/sv/daily',
        'en-JP': 'https://www.lexiclash.live/en/daily',
        'ja-JP': 'https://www.lexiclash.live/ja/daily',
        'en-ES': 'https://www.lexiclash.live/en/daily',
        'es-ES': 'https://www.lexiclash.live/es/daily',
        'en-MX': 'https://www.lexiclash.live/en/daily',
        'es-MX': 'https://www.lexiclash.live/es/daily',
        'en-AU': 'https://www.lexiclash.live/en/daily',
        'es-AR': 'https://www.lexiclash.live/es/daily',
        'es-CO': 'https://www.lexiclash.live/es/daily',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface DailyLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DailyLayout({ children, params }: DailyLayoutProps): Promise<ReactNode> {
  const { locale } = await params;
  const localePath = `/${locale}`;
  const localeSeo = seoContent[locale as keyof typeof seoContent] || seoContent.en;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `https://www.lexiclash.live${localePath}/daily#breadcrumb`,
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
        name: localeSeo.title,
        item: `https://www.lexiclash.live${localePath}/daily`,
      },
    ],
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `https://www.lexiclash.live${localePath}/daily#webpage`,
    url: `https://www.lexiclash.live${localePath}/daily`,
    name: `${localeSeo.title} - LexiClash`,
    description: localeSeo.description,
    isPartOf: {
      '@id': 'https://www.lexiclash.live/#website',
    },
    breadcrumb: {
      '@id': `https://www.lexiclash.live${localePath}/daily#breadcrumb`,
    },
    about: {
      '@id': 'https://www.lexiclash.live/#webapp',
    },
  };

  // ItemList schema for the daily challenge modes
  const challengeListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `https://www.lexiclash.live${localePath}/daily#challenges`,
    name: 'Daily Word Challenges',
    description: 'Daily word challenge updated every day',
    numberOfItems: 2,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Word Hunt Survival',
        description: 'Classic word search puzzle with 10 attempts to find the target word. Same board worldwide each day. Share emoji results like Wordle!',
        url: `https://www.lexiclash.live${localePath}/daily`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Daily Word Wheel',
        description: 'Find words from a wheel of letters. Every word must include the center letter. New puzzle daily at midnight UTC. Compete for the world record!',
        url: `https://www.lexiclash.live${localePath}/daily/word-wheel`,
      },
    ],
  };

  // Event schema for Daily Challenge - recurring daily event (like Wordle)
  // This helps search engines understand the time-sensitive nature of the content
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // VideoGame + WebApplication multi-typed entity for the daily challenge.
  // Multi-typing lets Google index the same node under both spaces (game discovery + app discovery).
  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': ['VideoGame', 'WebApplication', 'SoftwareApplication'],
    '@id': `https://www.lexiclash.live${localePath}/daily#videogame`,
    name: `LexiClash - ${localeSeo.title}`,
    description: localeSeo.description,
    url: `https://www.lexiclash.live${localePath}/daily`,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web, Android',
    genre: ['Word', 'Puzzle', 'Daily Challenge'],
    gamePlatform: ['Web', 'Android', 'iOS'],
    playMode: 'SinglePlayer',
    numberOfPlayers: {
      '@type': 'QuantitativeValue',
      minValue: 1,
      maxValue: 1,
    },
    isFamilyFriendly: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    publisher: {
      '@type': 'Organization',
      '@id': 'https://www.lexiclash.live/#organization',
      name: 'LexiClash',
    },
    // aggregateRating intentionally omitted — hardcoded ratings risk a Google
    // manual action. Do not reintroduce without verified UGC ratings AND a
    // visible rating badge on the page (Google policy requires both).
    browserRequirements: 'Requires a modern web browser',
    inLanguage: ['en', 'he', 'sv', 'ja', 'es'],
  };

  // FAQPage schema — uses the same locale FAQ already rendered (sr-only) by
  // GamePageSeoContent, so AI search engines (ChatGPT, Perplexity) and Google
  // rich-results can surface answers directly from /daily without rewrites.
  const localeFaq = seoContent[locale as keyof typeof seoContent]?.faq || seoContent.en.faq;
  const faqPageSchema = localeFaq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `https://www.lexiclash.live${localePath}/daily#faq`,
    mainEntity: localeFaq.map((qa) => ({
      '@type': 'Question',
      name: qa.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: qa.answer,
      },
    })),
  } : null;

  // HowTo schema — structures the "play the daily challenge" flow as four
  // discrete steps. Targets Google's HowTo rich result + AI quotability for
  // queries like "how to play LexiClash daily challenge".
  const howToStepsByLocale: Record<string, { name: string; text: string }[]> = {
    en: [
      { name: 'Open the daily page', text: 'Visit lexiclash.live/daily — no signup or download required.' },
      { name: 'Pick a mode', text: 'Choose Word Hunt Survival (find a hidden word in 10 attempts) or Daily Word Wheel (form words from a letter wheel).' },
      { name: 'Solve the puzzle', text: 'Same board for every player worldwide. Use clues from misses to narrow the answer.' },
      { name: 'Share and climb the leaderboard', text: 'Copy your emoji result like Wordle, build a daily streak, and compete on the global leaderboard that resets at midnight UTC.' },
    ],
    he: [
      { name: 'פתחו את הדף היומי', text: 'היכנסו ל-lexiclash.live/daily — ללא הרשמה או הורדה.' },
      { name: 'בחרו מצב משחק', text: 'מצא מילה (10 ניסיונות) או גלגל מילים (יצירת מילים מאותיות).' },
      { name: 'פתרו את הפאזל', text: 'אותו לוח לכל שחקן בעולם. השתמשו ברמזים מניסיונות שגויים.' },
      { name: 'שתפו והתחרו', text: 'העתיקו את תוצאת האימוג\'י, בנו רצף יומי, והתחרו בטבלת מובילים גלובלית.' },
    ],
    sv: [
      { name: 'Oeppna daglig sida', text: 'Besoek lexiclash.live/daily — ingen registrering eller nedladdning.' },
      { name: 'Vaelj laege', text: 'Ordjakt (hitta dolt ord paa 10 foersoek) eller Ordhjul (bilda ord fraan bokstaever).' },
      { name: 'Loes pusslet', text: 'Samma braede foer alla spelare. Anvaend ledtraadar fraan missade gissningar.' },
      { name: 'Dela och taevla', text: 'Kopiera emoji-resultat, bygg daglig strak, taevla paa global topplista.' },
    ],
    ja: [
      { name: 'デイリーページを開く', text: 'lexiclash.live/daily にアクセス — 登録・ダウンロード不要。' },
      { name: 'モードを選ぶ', text: 'ワードハント（10回で隠された単語を見つける）またはワードホイール（文字から単語を作る）。' },
      { name: 'パズルを解く', text: '世界中の全プレイヤーが同じボード。外れた手がかりを使って答えを絞り込む。' },
      { name: 'シェアしてランキングへ', text: '絵文字結果をコピー、デイリーストリークを積み、UTC午前0時にリセットされるグローバルランキングで競争。' },
    ],
    es: [
      { name: 'Abre la pagina diaria', text: 'Visita lexiclash.live/daily — sin registro ni descarga.' },
      { name: 'Elige el modo', text: 'Caza de Palabras (encuentra la palabra oculta en 10 intentos) o Rueda de Palabras (forma palabras desde una rueda).' },
      { name: 'Resuelve el puzzle', text: 'Mismo tablero para todos los jugadores del mundo. Usa pistas de intentos fallidos.' },
      { name: 'Comparte y compite', text: 'Copia tu resultado emoji, construye una racha diaria y compite en el ranking global que se reinicia a medianoche UTC.' },
    ],
  };
  const howToSteps = howToStepsByLocale[locale] || howToStepsByLocale.en;
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `https://www.lexiclash.live${localePath}/daily#howto`,
    name: localeSeo.title,
    description: localeSeo.description,
    totalTime: 'PT5M',
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
    step: howToSteps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      url: `https://www.lexiclash.live${localePath}/daily#step-${i + 1}`,
    })),
    inLanguage: locale,
  };

  // Event schema for Word Hunt Survival - daily recurring event
  const wordHuntEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `https://www.lexiclash.live${localePath}/daily#wordhunt-event`,
    name: 'Word Hunt Survival - Daily Challenge',
    description: 'Daily word search puzzle with 10 attempts to find the hidden word. Same board for everyone worldwide. New puzzle every day at midnight UTC. Share emoji results like Wordle!',
    startDate: today.toISOString().split('T')[0],
    endDate: tomorrow.toISOString().split('T')[0],
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      url: `https://www.lexiclash.live${localePath}/daily`,
    },
    organizer: {
      '@id': 'https://www.lexiclash.live/#organization',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `https://www.lexiclash.live${localePath}/daily`,
      validFrom: today.toISOString().split('T')[0],
    },
    performer: {
      '@type': 'Organization',
      name: 'LexiClash',
    },
    image: 'https://www.lexiclash.live/og-image-en.webp',
    isAccessibleForFree: true,
    inLanguage: ['en', 'he', 'sv', 'ja', 'es'],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbSchema,
            webPageSchema,
            challengeListSchema,
            softwareAppSchema,
            wordHuntEventSchema,
            howToSchema,
            ...(faqPageSchema ? [faqPageSchema] : []),
          ]),
        }}
      />
      {children}
      <GamePageSeoContent
        asH1
        title={seoContent[locale as keyof typeof seoContent]?.title || seoContent.en.title}
        description={seoContent[locale as keyof typeof seoContent]?.description || seoContent.en.description}
        features={seoContent[locale as keyof typeof seoContent]?.features || seoContent.en.features}
        faq={seoContent[locale as keyof typeof seoContent]?.faq || seoContent.en.faq}
      />
    </>
  );
}
