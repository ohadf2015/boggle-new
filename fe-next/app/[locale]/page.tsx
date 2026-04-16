import type { Metadata } from 'next';
import HomePageClient from './PageClient';
import { fetchLandingData } from '@/lib/landing/fetchLandingData';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';

/**
 * Main landing page - Game mode selection
 * Users choose between Single Player and Multiplayer modes
 */

// ISR: Revalidate landing data every 5 minutes.
// Mode card order is computed from gameModeStats at build/revalidation time,
// so no per-request DB calls for card ordering.
export const revalidate = 300;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const titleMap: Record<string, string> = {
  en: 'LexiClash – Free Multiplayer Word Game Online | No Download, Play Now',
  he: 'לקסיקלאש – משחק מילים מרובה משתתפים חינם | בוגל אונליין בעברית',
  sv: 'LexiClash – Gratis Ordspel Online Med Vänner | Ingen Nedladdning',
  ja: 'LexiClash – 無料マルチプレイヤーワードゲーム | ブラウザで即プレイ',
  es: 'LexiClash – Juego de Palabras Multijugador Online Gratis | Sin Descarga',
};

const descriptionMap: Record<string, string> = {
  en: 'Play the best free multiplayer word game online — no download, no signup. Real-time word battles with friends like Boggle & Words With Friends combined. Daily word wheel, adventure mode, brain training. 2-20+ players, 5 languages, instant play in your browser.',
  he: 'משחק מילים מרובה משתתפים חינם בעברית — ללא הורדה! כמו בוגל וסקראבל אבל בזמן אמת עם חברים. אתגר מילים יומי, מצב הרפתקה, אימון מוח. 10,000+ מילים בעברית, מושלם למסיבות וערבי משפחה.',
  sv: 'Spela gratis ordspel online med vänner — ingen nedladdning. Realtids multiplayer-ordstrider som Alfapet och Boggle men snabbare. Dagligt ordhjul, äventyrsläge, hjärnträning. Perfekt för spelkvällar och fester. 5 språk, spela direkt.',
  ja: '友達と無料マルチプレイヤーワードゲームをプレイ — ダウンロード不要。リアルタイムワードバトル、デイリーワードホイール、アドベンチャーモード、脳トレ。ブラウザゲームで即座にプレイ。',
  es: 'Juega el mejor juego de palabras multijugador online gratis con amigos — sin descarga. Batallas de palabras en tiempo real, rueda de palabras diaria, modo aventura. Como Boggle y Wordle pero competitivo. 5 idiomas, juega al instante.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: { absolute: titleMap[locale] || titleMap.en },
    description: descriptionMap[locale] || descriptionMap.en,
  };
}

const seoContent: Record<string, {
  title: string;
  description: string;
  features: string[];
  faq: { question: string; answer: string }[];
}> = {
  en: {
    title: 'LexiClash — Free Multiplayer Word Game Online',
    description:
      'LexiClash is a free online multiplayer word game that combines the grid-based word hunting of Boggle with real-time competitive gameplay. Find words on a shared letter grid, race against friends or strangers, and climb the leaderboard — all in your browser with no download or signup required. Play in English, Hebrew, Swedish, Japanese, or Spanish across multiple game modes including Classic, Word Hunt, Blast, and the daily Word Wheel challenge. LexiClash also features Adventure Mode with 50+ progressive levels, Brain Training drills for cognitive improvement, and a Party Mode designed for group play on a shared TV screen.',
    features: [
      'Real-time multiplayer word battles — 2 to 20+ players on the same grid simultaneously',
      'Six distinct game modes: Classic, Word Hunt, Blast, Wheel Rush, Adventure, and Brain Training',
      'Daily Word Wheel challenge with global leaderboards and streak tracking',
      'Adventure Mode with 50+ levels, boss fights, and progressive difficulty',
      'Brain Training drills: Lightning Round, Rare Gems, Combo Master, Pattern Switcher, Memory Hunt',
      'Party Mode for game nights — play on a shared TV with phones as controllers',
      'Five language support: English, Hebrew (RTL), Swedish, Japanese, and Spanish',
      'No download, no signup — play instantly in any modern browser on phone, tablet, or desktop',
      'Custom avatars, achievements, XP progression, and seasonal leaderboards',
      'Built on peer-reviewed cognitive science — word games improve vocabulary, memory, and processing speed',
    ],
    faq: [
      {
        question: 'What is LexiClash and how do I play?',
        answer:
          'LexiClash is a free multiplayer word game where you find words on a letter grid in real time. Swipe or type to connect adjacent letters and form words before the timer runs out. The longer and rarer the word, the more points you score. You can play solo, against AI, or challenge friends in private rooms.',
      },
      {
        question: 'Is LexiClash free to play?',
        answer:
          'Yes — LexiClash is completely free with no download or account required. Open it in your browser and start playing immediately. There are no paywalls, ads-to-unlock mechanics, or premium-only game modes.',
      },
      {
        question: 'How is LexiClash different from Boggle, Scrabble, or Wordle?',
        answer:
          'Unlike Scrabble (turn-based tile placement) or Wordle (single daily guess), LexiClash is a real-time competitive word hunt on a shared grid. Everyone plays simultaneously under time pressure, with live score feeds and combo chains. Think of it as Boggle meets esports — same grid-search concept, but multiplayer, scored, and fast.',
      },
      {
        question: 'What languages does LexiClash support?',
        answer:
          'LexiClash supports five languages: English, Hebrew (with full right-to-left support), Swedish, Japanese, and Spanish. Each language has its own validated dictionary, scoring system, and localized UI. You can switch languages at any time from the settings menu.',
      },
      {
        question: 'Can I play LexiClash on my phone?',
        answer:
          'Yes — LexiClash is a progressive web app optimized for mobile browsers. It works on any modern smartphone, tablet, or desktop without downloading an app. Swipe to find words on touch screens or type on desktop keyboards.',
      },
    ],
  },
  he: {
    title: 'LexiClash — משחק מילים מרובה משתתפים חינם',
    description:
      'LexiClash הוא משחק מילים מרובה משתתפים חינמי שמשלב חיפוש מילים על לוח אותיות עם משחקיות תחרותית בזמן אמת. מצאו מילים על לוח משותף, התחרו נגד חברים או זרים, וטפסו בטבלת המובילים — הכל בדפדפן ללא הורדה או הרשמה. שחקו בעברית, אנגלית, שוודית, יפנית או ספרדית במגוון מצבי משחק.',
    features: [
      'קרבות מילים מרובי משתתפים בזמן אמת — 2 עד 20+ שחקנים על אותו לוח',
      'שישה מצבי משחק: קלאסי, ציד מילים, בלאסט, גלגל מילים, הרפתקה ואימון מוח',
      'אתגר גלגל מילים יומי עם טבלאות מובילים גלובליות',
      'מצב הרפתקה עם 50+ שלבים, קרבות בוסים ורמת קושי עולה',
      'חמש שפות: עברית (RTL מלא), אנגלית, שוודית, יפנית וספרדית',
      'ללא הורדה, ללא הרשמה — שחקו מיד בכל דפדפן מודרני',
    ],
    faq: [
      {
        question: 'מה זה LexiClash ואיך משחקים?',
        answer:
          'LexiClash הוא משחק מילים מרובה משתתפים חינמי שבו מוצאים מילים על לוח אותיות בזמן אמת. החליקו או הקלידו כדי לחבר אותיות סמוכות ולהרכיב מילים לפני שהטיימר נגמר. ניתן לשחק לבד, נגד AI, או לאתגר חברים בחדרים פרטיים.',
      },
      {
        question: 'האם LexiClash חינמי?',
        answer:
          'כן — LexiClash חינמי לחלוטין ללא הורדה וללא צורך בחשבון. פתחו בדפדפן והתחילו לשחק מיד.',
      },
    ],
  },
  sv: {
    title: 'LexiClash — Gratis Multiplayer-ordspel Online',
    description:
      'LexiClash är ett gratis online multiplayer-ordspel som kombinerar rutnätsbaserad ordjakt med tävlingsinriktad realtidsspelning. Hitta ord på ett delat bokstavsrutnät, tävla mot vänner eller främlingar och klättra på topplistan — allt i din webbläsare utan nedladdning eller registrering.',
    features: [
      'Ordstrider i realtid — 2 till 20+ spelare på samma rutnät samtidigt',
      'Sex spellägen: Klassiskt, Ordjakt, Blast, Ordhjul, Äventyr och Hjärnträning',
      'Daglig Ordhjulsutmaning med globala topplistor',
      'Äventyrsläge med 50+ nivåer och stigande svårighetsgrad',
      'Fem språk: engelska, hebreiska, svenska, japanska och spanska',
      'Ingen nedladdning — spela direkt i valfri modern webbläsare',
    ],
    faq: [
      {
        question: 'Vad är LexiClash och hur spelar man?',
        answer:
          'LexiClash är ett gratis multiplayer-ordspel där du hittar ord på ett bokstavsrutnät i realtid. Svep eller skriv för att koppla ihop intilliggande bokstäver och bilda ord innan tiden tar slut.',
      },
      {
        question: 'Är LexiClash gratis?',
        answer:
          'Ja — LexiClash är helt gratis utan nedladdning eller konto. Öppna i webbläsaren och börja spela direkt.',
      },
    ],
  },
  ja: {
    title: 'LexiClash — 無料マルチプレイヤーワードゲーム',
    description:
      'LexiClashは、グリッドベースのワードハンティングとリアルタイム対戦を組み合わせた無料オンラインマルチプレイヤーワードゲームです。共有レターグリッド上で単語を見つけ、友達や見知らぬ人と競い、リーダーボードを駆け上がりましょう。ダウンロードもサインアップも不要で、ブラウザですぐにプレイできます。',
    features: [
      'リアルタイムマルチプレイヤーワードバトル — 同じグリッドで2〜20人以上が同時プレイ',
      '6つのゲームモード：クラシック、ワードハント、ブラスト、ワードホイール、アドベンチャー、脳トレ',
      'デイリーワードホイールチャレンジとグローバルリーダーボード',
      'アドベンチャーモード：50以上のレベルとプログレッシブ難易度',
      '5言語対応：英語、ヘブライ語、スウェーデン語、日本語、スペイン語',
      'ダウンロード不要 — 任意のモダンブラウザで即座にプレイ',
    ],
    faq: [
      {
        question: 'LexiClashとは何ですか？どうやってプレイしますか？',
        answer:
          'LexiClashは、レターグリッド上でリアルタイムに単語を見つける無料マルチプレイヤーワードゲームです。スワイプまたはタイプで隣接する文字をつなげて単語を作り、タイマーが切れる前にスコアを稼ぎましょう。',
      },
      {
        question: 'LexiClashは無料ですか？',
        answer:
          'はい — LexiClashはダウンロード不要、アカウント不要で完全無料です。ブラウザを開いてすぐにプレイを開始できます。',
      },
    ],
  },
  es: {
    title: 'LexiClash — Juego de Palabras Multijugador Gratis Online',
    description:
      'LexiClash es un juego de palabras multijugador gratuito en línea que combina la búsqueda de palabras en cuadrícula con jugabilidad competitiva en tiempo real. Encuentra palabras en un tablero compartido, compite contra amigos o desconocidos y sube en la tabla de clasificación — todo en tu navegador sin descarga ni registro.',
    features: [
      'Batallas de palabras en tiempo real — de 2 a 20+ jugadores en el mismo tablero simultáneamente',
      'Seis modos de juego: Clásico, Caza de Palabras, Blast, Rueda de Palabras, Aventura y Entrenamiento Cerebral',
      'Desafío diario de Rueda de Palabras con tablas de clasificación globales',
      'Modo Aventura con más de 50 niveles y dificultad progresiva',
      'Cinco idiomas: inglés, hebreo, sueco, japonés y español',
      'Sin descarga — juega directamente en cualquier navegador moderno',
    ],
    faq: [
      {
        question: '¿Qué es LexiClash y cómo se juega?',
        answer:
          'LexiClash es un juego de palabras multijugador gratuito donde encuentras palabras en un tablero de letras en tiempo real. Desliza o escribe para conectar letras adyacentes y formar palabras antes de que se acabe el tiempo.',
      },
      {
        question: '¿Es gratis LexiClash?',
        answer:
          'Sí — LexiClash es completamente gratis sin descarga ni cuenta. Abre el navegador y empieza a jugar al instante.',
      },
    ],
  },
};

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  // Fetch non-realtime landing data server-side to eliminate client waterfall.
  // Capped at 2s — client hooks provide fallback when initialData is absent.
  // Reduced from 4s: if Supabase is slow, faster to let client fetch than block SSR.
  const initialData = await Promise.race([
    fetchLandingData(locale),
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 2000)),
  ]).catch(() => undefined);

  const content = seoContent[locale] ?? seoContent.en;
  return (
    <>
      <HomePageClient initialData={initialData} />
      <GamePageSeoContent
        title={content.title}
        description={content.description}
        features={content.features}
        faq={content.faq}
      />
    </>
  );
}
