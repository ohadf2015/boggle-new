import type { Metadata } from 'next';
import HomePageClient from '../PageClient';
import { fetchLandingData } from '@/lib/landing/fetchLandingData';
import { HomepageContentSection } from '@/components/seo/HomepageContentSection';
import { buildHomepageFaqJsonLd } from '@/lib/seo/homepageFaqJsonLd';
import { EsScrabbleCrossLink } from '@/components/seo/EsScrabbleCrossLink';
import { SvScrabbleCrossLink } from '@/components/seo/SvScrabbleCrossLink';
import { EnBoggleCrossLink } from '@/components/seo/EnBoggleCrossLink';
import { SUPPORTED_LOCALES } from '@/lib/localeResolution';

/**
 * Main landing page - Game mode selection
 *
 * ISR: revalidate every 5 minutes. All client-only inputs (?room=, ?next=,
 * FTUE state, auth) are consumed in PageClient via window/localStorage,
 * so this route is safely static-renderable.
 */
export const revalidate = 300;

/**
 * `[locale]` is a dynamic segment, so without these params Next cannot
 * prerender anything beneath it and the `revalidate` above is inert — which is
 * why `next build` reported 453 of 456 routes as ƒ (Dynamic) and production
 * answered `cache-control: private, no-store` on every page, SEO pages
 * included (verified live on /en, /en/faq, /en/tools, /en/blog/*).
 *
 * Necessary but NOT yet sufficient, measured 2026-08-25: with these params the
 * build prerenders 214 pages (it previously aborted here — see the
 * GlobalBottomNav fix), but the route table still prints ƒ for this route. The
 * remaining dynamic signal is almost certainly `fetchCache = 'force-no-store'`
 * on app/[locale]/layout.tsx, which is a deliberate workaround for the Next 16
 * memory leak (vercel/next.js#90433) and cannot simply be dropped. When that
 * lands upstream, removing it should flip these routes to ● with no further
 * work here.
 */
export function generateStaticParams(): Array<{ locale: string }> {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

const titleMap: Record<string, string> = {
  en: 'Play Free Multiplayer Word Games Online — LexiClash 2026',
  he: 'משחקי מילים אונליין · מרובה משתתפים בעברית חינם | LexiClash',
  sv: 'Spela Gratis Ordspel Online — Multiplayer | LexiClash',
  ja: '無料オンラインワードゲーム｜友達と対戦・日本語対応 LexiClash',
  es: 'Juegos de Palabras Multijugador en Español | LexiClash',
  ru: 'Игры в слова онлайн — играй бесплатно с другими | LexiClash',
};

const keywordsMap: Record<string, string> = {
  en: 'free multiplayer word game, boggle online free, boggle shake, daily word wheel, word wheel puzzles free online, free boggle online no download, word games online free, words with friends alternative, multiplayer word games online',
  he: 'משחק מילים מרובה משתתפים, גלגל מילים יומי, בוגל אונליין, משחקי מילים חינם',
  sv: 'gratis ordspel online, dagligt ordhjul, ordspel multiplayer, alfapet alternativ',
  ja: '無料ワードゲーム, デイリーワードホイール, 多人数ワードゲーム, ワードパズル',
  es: 'juegos de palabras gratis, rueda de palabras diaria, juego multijugador de palabras',
  ru: 'игры в слова, игра в слова онлайн, составь слова из букв, найди слова, словесные игры, балда онлайн, эрудит онлайн, анаграммы онлайн, игра в слова с друзьями, слово дня',
};

const descriptionMap: Record<string, string> = {
  en: 'Free multiplayer word game — no signup, no download. Real-time Boggle-style battles, daily word wheel, 6 modes, 5 languages. Play in browser. Start now →',
  he: 'משחק מילים מרובה משתתפים חינם בעברית — ללא הורדה. בוגל בזמן אמת עם חברים, גלגל מילים יומי, 6 מצבי משחק, 10,000+ מילים. שחק עכשיו בדפדפן ←',
  sv: 'Spela gratis ordspel online med vänner — ingen nedladdning. Realtids ordstrider, dagligt ordhjul, 6 spellägen, 5 språk. Som Alfapet möter Boggle. Spela nu →',
  ja: '友達と無料マルチプレイヤーワードゲーム — 登録不要・ダウンロード不要。リアルタイム単語バトル、毎日のワードホイール、6モード、5言語対応。今すぐブラウザで開始 →',
  es: 'Juego de palabras multijugador gratis — sin descarga, sin registro. Batallas en tiempo real, rueda diaria, 6 modos, 5 idiomas. ¡Juega en tu navegador! →',
  ru: 'Бесплатная игра в слова с другими игроками — без регистрации и скачивания. Битвы в реальном времени, ежедневное колесо слов, 6 режимов. Играй в браузере →',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: { absolute: titleMap[locale] || titleMap.en },
    description: descriptionMap[locale] || descriptionMap.en,
    keywords: keywordsMap[locale] || keywordsMap.en,
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
      'LexiClash is a free online multiplayer word game that combines the grid-based word hunting of Boggle with real-time competitive gameplay. Find words on a shared letter grid, race against friends or strangers, and climb the leaderboard — all in your browser with no download or signup required. Play in English, Hebrew, Swedish, Japanese, or Spanish across multiple game modes including Classic, Word Hunt, Blast, and the daily Word Wheel challenge. LexiClash also features Adventure Mode with 100 progressive levels across 10 themed worlds, Brain Training drills for cognitive improvement, and a Party Mode designed for group play on a shared TV screen.',
    features: [
      'Real-time multiplayer word battles — 2 to 20+ players on the same grid simultaneously',
      'Six distinct game modes: Classic, Word Hunt, Blast, Wheel Rush, Adventure, and Brain Training',
      'Daily Word Wheel challenge with global leaderboards and streak tracking',
      'Adventure Mode with 100 levels across 10 themed worlds, boss fights, and progressive difficulty',
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
  ru: {
    title: 'LexiClash — бесплатная игра в слова онлайн',
    description:
      'LexiClash — это бесплатная многопользовательская игра в слова, которая соединяет поиск слов на буквенном поле в духе «Балды» и «Боггла» с соревновательным геймплеем в реальном времени. Составляйте слова из букв на общем поле, соревнуйтесь с друзьями или случайными соперниками и поднимайтесь в таблице лидеров — прямо в браузере, без скачивания и регистрации. Играйте на русском, английском, иврите, шведском, японском или испанском в нескольких режимах: «Классический», «Охота за словами», «Бласт» и ежедневное «Колесо слов». В LexiClash также есть режим приключений со 100 уровнями в 10 тематических мирах, тренировки для мозга и режим вечеринки для игры компанией на одном экране телевизора.',
    features: [
      'Битвы в слова в реальном времени — от 2 до 20+ игроков на одном поле одновременно',
      'Шесть режимов: «Классический», «Охота за словами», «Бласт», «Колесо слов», «Приключение» и «Тренировка мозга»',
      'Ежедневное «Колесо слов» (слово дня) с мировыми таблицами лидеров и сериями',
      'Режим приключений: 100 уровней в 10 тематических мирах, боссы и растущая сложность',
      'Тренировки мозга: молниеносный раунд, редкие самоцветы, мастер комбо, переключатель шаблонов',
      'Режим вечеринки для игровых вечеров — играйте на экране телевизора, телефоны как пульты',
      'Поддержка шести языков: русский, английский, иврит (RTL), шведский, японский и испанский',
      'Без скачивания и регистрации — играйте сразу в любом современном браузере на телефоне, планшете или компьютере',
      'Свои аватары, достижения, прокачка опыта и сезонные таблицы лидеров',
      'Игры в слова развивают словарный запас, память и скорость мышления',
    ],
    faq: [
      {
        question: 'Что такое LexiClash и как играть?',
        answer:
          'LexiClash — это бесплатная игра в слова для нескольких игроков, где вы ищете слова на буквенном поле в реальном времени. Проводите пальцем или печатайте, чтобы соединять соседние буквы и составлять слова, пока не вышло время. Чем длиннее и реже слово, тем больше очков. Можно играть в одиночку, против ИИ или бросить вызов друзьям в закрытой комнате.',
      },
      {
        question: 'LexiClash бесплатный?',
        answer:
          'Да — LexiClash полностью бесплатный, без скачивания и без регистрации. Откройте его в браузере и сразу начинайте играть. Никаких платных стен, рекламы для разблокировки или режимов только по подписке.',
      },
      {
        question: 'Чем LexiClash отличается от «Балды», «Эрудита» или Wordle?',
        answer:
          'В отличие от «Эрудита» (расстановка фишек по очереди) или Wordle (одна догадка в день), LexiClash — это соревновательный поиск слов в реальном времени на общем поле. Все играют одновременно под таймером, со счётом в прямом эфире и цепочками комбо. Представьте «Балду», только быструю, многопользовательскую и с очками.',
      },
      {
        question: 'Какие языки поддерживает LexiClash?',
        answer:
          'LexiClash поддерживает шесть языков: русский, английский, иврит (с полной поддержкой письма справа налево), шведский, японский и испанский. У каждого языка свой проверенный словарь, своя система очков и переведённый интерфейс. Язык можно сменить в любой момент в настройках.',
      },
      {
        question: 'Можно ли играть в LexiClash на телефоне?',
        answer:
          'Да — LexiClash это прогрессивное веб-приложение, оптимизированное для мобильных браузеров. Оно работает на любом современном смартфоне, планшете или компьютере без установки приложения. Ищите слова свайпом на сенсорном экране или печатайте на клавиатуре.',
      },
    ],
  },
  he: {
    title: 'LexiClash — משחק מילים מרובה משתתפים חינם',
    description:
      'LexiClash הוא משחק מילים מרובה משתתפים חינמי בעברית שמשלב את חיפוש המילים על לוח אותיות בסגנון בוגל עם משחק תחרותי בזמן אמת בסגנון סקרבל. מצאו מילים על לוח משותף, התחרו ראש בראש מול חברים או יריבים אקראיים, וטפסו בטבלת המובילים — הכל ישירות בדפדפן, בלי הורדה ובלי הרשמה. שחקו בעברית, אנגלית, שוודית, יפנית או ספרדית במגוון מצבי משחק: קלאסי, ציד מילים, בלאסט, גלגל מילים (מילת היום), מצב הרפתקה עם 50+ שלבים, ואימוני מוח לשיפור אוצר מילים, זיכרון ומהירות עיבוד. LexiClash כולל גם מצב מסיבה למשחק קבוצתי על מסך טלוויזיה משותף עם הטלפונים כשלטים.',
    features: [
      'קרבות מילים מרובי משתתפים בזמן אמת — 2 עד 20+ שחקנים על אותו לוח בו-זמנית',
      'שישה מצבי משחק: קלאסי, ציד מילים, בלאסט, גלגל מילים, הרפתקה ואימון מוח',
      'אתגר מילת היום בגלגל מילים יומי עם טבלאות מובילים גלובליות ומעקב רצפים',
      'מצב הרפתקה עם 50+ שלבים, קרבות בוסים ורמת קושי עולה',
      'אימוני מוח: סיבוב ברק, אבנים נדירות, מאסטר קומבו, מחליף תבניות וציד זיכרון',
      'מצב מסיבה לערבי משחקים — שחקו על מסך טלוויזיה משותף עם טלפונים כשלטים',
      'תמיכה בחמש שפות: עברית (RTL מלא), אנגלית, שוודית, יפנית וספרדית',
      'ללא הורדה, ללא הרשמה — שחקו מיד בכל דפדפן מודרני בטלפון, בטאבלט או במחשב',
      'אווטרים מותאמים אישית, הישגים, התקדמות XP וטבלאות מובילים עונתיות',
      'מבוסס על מדע קוגניטיבי — משחקי מילים משפרים אוצר מילים, זיכרון ומהירות עיבוד',
    ],
    faq: [
      {
        question: 'מה זה LexiClash ואיך משחקים?',
        answer:
          'LexiClash הוא משחק מילים מרובה משתתפים חינמי שבו מוצאים מילים על לוח אותיות בזמן אמת. מחליקים אצבע או מקלידים כדי לחבר אותיות סמוכות ולהרכיב מילים לפני שייגמר הזמן. ככל שהמילה ארוכה ונדירה יותר, כך מקבלים יותר נקודות. אפשר לשחק לבד, מול המחשב, או לאתגר חברים בחדר פרטי.',
      },
      {
        question: 'האם LexiClash חינמי לשחק?',
        answer:
          'כן — LexiClash חינמי לגמרי, בלי הורדה ובלי צורך בחשבון. פותחים בדפדפן ומתחילים לשחק מיד. אין תשלומים נסתרים, אין פרסומות שצריך לצפות בהן כדי לפתוח תכנים, ואין מצבי משחק בתשלום.',
      },
      {
        question: 'במה LexiClash שונה מבוגל, סקרבל או וורדל?',
        answer:
          'בניגוד לסקרבל (הנחת אריחים בתורות) או וורדל (ניחוש יומי בודד), LexiClash הוא ציד מילים תחרותי בזמן אמת על לוח משותף. כולם משחקים בו-זמנית תחת לחץ של שעון, הניקוד מתעדכן לנגד העיניים ויש שרשראות קומבו. תחשבו על בוגל — רק מהיר, תחרותי ומלא אקשן: אותו רעיון של חיפוש מילים על הלוח, אבל מרובה משתתפים ועם ניקוד.',
      },
      {
        question: 'באילו שפות LexiClash תומך?',
        answer:
          'LexiClash תומך בחמש שפות: עברית (עם תמיכה מלאה מימין לשמאל), אנגלית, שוודית, יפנית וספרדית. לכל שפה מילון מאומת משלה, שיטת ניקוד משלה, וממשק מתורגם. ניתן להחליף שפה בכל עת מתפריט ההגדרות.',
      },
      {
        question: 'האם אפשר לשחק ב-LexiClash מהטלפון?',
        answer:
          'כן — LexiClash הוא אפליקציית אינטרנט מתקדמת (PWA) מותאמת לדפדפני מובייל. היא עובדת בכל סמארטפון, טאבלט או מחשב מודרניים ללא צורך בהורדת אפליקציה. החליקו כדי למצוא מילים במסך מגע או הקלידו במקלדת שולחנית.',
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
  // fetchLandingData is cached per-locale (see LANDING_CACHE_TTL_MS), so this is
  // a ~0ms memory read for all but the first request per TTL window. The race
  // below is a cold-miss safety net only: if the underlying DB fetch stalls we
  // ship HTML immediately and client hooks hydrate the data (they already
  // fall back gracefully when initialData is absent), rather than blocking TTFB.
  const SSR_LANDING_DATA_BUDGET_MS = 1500;
  const initialData = await Promise.race([
    fetchLandingData(locale),
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), SSR_LANDING_DATA_BUDGET_MS)),
  ]).catch(() => undefined);

  const content = seoContent[locale] ?? seoContent.en;
  const faqJsonLd = JSON.stringify(buildHomepageFaqJsonLd(locale));
  return (
    <>
      {/* Preload hero mascot from first server HTML byte — fires before the client
          component subtree emits its own <Image priority> preload, giving the
          browser a head-start on the 402 KB animated WebP that is the LCP element.
          Mirrors the same pattern used on the multiplayer page (/mascot/play.webp). */}
      <link rel="preload" as="image" href="/mascot/winner.webp" type="image/webp" fetchPriority="high" />
      {/* Preload the LCP element (anchor mode-cube image) from the very first
          HTML bytes. next/image's own priority preload is emitted where the
          client subtree renders — ~78% through the 900KB streamed document —
          so discovery was delayed by ~3s (Lighthouse "LCP load delay 34%").
          imageSrcSet/imageSizes must match the anchor <Image> exactly so the
          browser reuses this preload instead of double-fetching. */}
      <link
        rel="preload"
        as="image"
        imageSrcSet="/_next/image?url=%2Fmodes%2Fcubes%2Farena.png&amp;w=640&amp;q=75 640w, /_next/image?url=%2Fmodes%2Fcubes%2Farena.png&amp;w=750&amp;q=75 750w, /_next/image?url=%2Fmodes%2Fcubes%2Farena.png&amp;w=828&amp;q=75 828w, /_next/image?url=%2Fmodes%2Fcubes%2Farena.png&amp;w=1080&amp;q=75 1080w, /_next/image?url=%2Fmodes%2Fcubes%2Farena.png&amp;w=1200&amp;q=75 1200w, /_next/image?url=%2Fmodes%2Fcubes%2Farena.png&amp;w=1920&amp;q=75 1920w"
        imageSizes="(max-width: 640px) min(100vw, 640px), (max-width: 768px) min(50vw, 384px), 50vw"
        fetchPriority="high"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />
      <HomePageClient initialData={initialData} />
      <EsScrabbleCrossLink locale={locale} anchorVariant="home" />
      <SvScrabbleCrossLink locale={locale} anchorVariant="home" />
      <EnBoggleCrossLink locale={locale} anchorVariant="home" />
      {/* Visible publisher content (was sr-only GamePageSeoContent until 2026-06-04).
          A human AdSense reviewer landing here now sees a real About/FAQ section and
          links into the editorial surface. See docs/2026-06-04-adsense-approval-plan.md. */}
      <HomepageContentSection content={content} locale={locale} />
    </>
  );
}
