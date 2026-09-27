import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { VideoGameJsonLd } from '@/components/seo/VideoGameJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { FaqPageJsonLd } from '@/components/seo/FaqPageJsonLd';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import { ModeLandingPlayButton } from '@/components/seo/ModeLandingPlayButton';
import { loadTranslation } from '@/translations/loadTranslation';
import { WordTowerV2PageClient } from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  // Word Tower is now public (GA) — indexable for search and AdSense review.
  // Canonical path is /word-tower; legacy /word-tower-v2 URLs 308 here (next.config).
  return generatePageMetadata({ seoKey: 'wordTowerV2', path: '/word-tower', locale, noIndex: false });
}

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Word Tower - Stack Words to Build Your Tower | Free Game',
    description:
      'Spell words to build the tallest tower! Word Tower is a fast-paced word puzzle game where you stack words, earn coins, unlock upgrades, and climb the daily leaderboard. Free to play, no download required. Compete with friends and rivals worldwide.',
    features: [
      'Spell words to add floors and build your tower higher and higher',
      'Earn coins per run and unlock permanent tower upgrades (foundations, cranes, vaults, shields)',
      'Stabilize your tower with the brace mechanic or rescue words to prevent collapse',
      'Wreck rival towers and raid their coins in real-time PvP battles',
      'Compete in the daily climb with unique challenges, same board worldwide',
    ],
    faq: [
      {
        question: 'What is Word Tower?',
        answer:
          'Word Tower is a free word puzzle game where you spell words to add floors to your tower, earn coins, and compete against rivals. Build the tallest tower, upgrade your district, and climb the daily leaderboard.',
      },
      {
        question: 'How does the daily climb work?',
        answer:
          'The daily climb is a fresh challenge every 24 hours with a unique board and leaderboard shared worldwide. Spell the longest words to climb higher and earn a spot on the global daily rankings.',
      },
      {
        question: 'How do tower upgrades work?',
        answer:
          'Earn coins from runs and spend them to unlock permanent upgrades in your tower workshop: foundation (steadier tower), crane (wider perfect window), vault (more coins), insurance (extra shields), and landmark (higher score). Maxed upgrades unlock new districts.',
      },
      {
        question: 'Can I raid other players?',
        answer:
          'Yes! Wreck rival towers by spelling words to knock down their floors and steal coins. Stronger towers earn more coins and rewards. Defend yourself with shields earned from crates.',
      },
      {
        question: 'Is Word Tower free?',
        answer:
          'Completely free! Play unlimited runs, unlock upgrades with coins you earn, and compete on leaderboards without any paywalls or ads. No download or signup required.',
      },
    ],
  },
  he: {
    title: 'וורד טאוור - בנו מגדל עם מילים | משחק חינם',
    description:
      'כתבו מילים כדי לבנות מגדל גבוה! וורד טאוור הוא משחק מילים מהיר שבו אתם כותבים מילים, אוספים מטבעות, פותחים שדרוגים וטפסים בדירוג יומי. משחק חינם, ללא הורדה. התחרו עם חברים ויריבים בעולם.',
    features: [
      'כתבו מילים כדי להוסיף קומות ולהעלות את המגדל גבוה יותר',
      'אספו מטבעות בכל סיבוב וטפסו שדרוגים קבועים למגדל (בסיסים, עגורנים, כספות, מגנים)',
      'יצרו מיתקן מגן עם אריח הגנה או מילים להצלה כדי למנוע התמוטטות',
      'הרסו מגדלים של יריבים וגנבו את המטבעות שלהם בקרבות PvP בזמן אמת',
      'התחרו בטיפוס היומי עם אתגרים ייחודיים, לוח משותף בעולם',
    ],
    faq: [
      {
        question: 'מה זה וורד טאוור?',
        answer:
          'וורד טאוור הוא משחק מילים חינם שבו אתם כותבים מילים כדי להוסיף קומות למגדל, אוספים מטבעות ומתחרים נגד יריבים. בנו מגדל גבוה, שדרגו את המחוז שלכם וטפסו בדירוג היומי הגלובלי.',
      },
      {
        question: 'איך עובד הטיפוס היומי?',
        answer:
          'הטיפוס היומי הוא אתגר חדש כל 24 שעות עם לוח ייחודי ודירוג משותף בעולם. כתבו את המילים הארוכות ביותר כדי להגיע לקומה גבוהה יותר וקבלו מקום בדירוגים היוميים הגלובליים.',
      },
      {
        question: 'איך עובדים שדרוגי המגדל?',
        answer:
          'אספו מטבעות מסיבובים והוציאו אותם כדי לטפס בחנות המגדל שלכם: בסיס (מגדל יציב יותר), עגורן (חלון מושלם רחב יותר), כספה (יותר מטבעות), ביטוח (מגנים נוספים), וציון דרך (ניקוד גבוה יותר). שדרוגים מושלמים פותחים מחוזות חדשים.',
      },
      {
        question: 'אני יכול להרוס מגדלים של שחקנים אחרים?',
        answer:
          'כן! הרסו מגדלים של יריבים על ידי כתיבת מילים כדי לסתום קומות וגנבו מטבעות. מגדלים חזקים יותר מרוויחים יותר מטבעות ופרסים. הגנו על עצמכם עם מגנים שתקבלו מתיבות.',
      },
      {
        question: 'האם וורד טאוור חינם?',
        answer:
          'חינם לחלוטין! שחקו סיבובים בלא הגבלה, טפסו שדרוגים עם מטבעות שאתם אוספים, והתחרו בדירוגים ללא תשלומים או מודעות. ללא הורדה או הרשמה נדרשת.',
      },
    ],
  },
  sv: {
    title: 'Word Tower - Staplа ord för att bygga ditt torn | Gratis spel',
    description:
      'Stava ord för att bygga det högsta tornet! Word Tower är ett snabbt ordpusselspel där du staplar ord, tjänar mynt, låser upp uppgraderingar och klättrar på den dagliga topplistan. Gratis att spela, ingen nedladdning krävs. Tävla med vänner och rivaler världen över.',
    features: [
      'Stava ord för att lägga till våningar och bygga ditt torn högre och högre',
      'Tjäna mynt per omgång och låsa upp permanenta tornuppgraderingar (fundament, kranar, valv, sköldar)',
      'Stabilisera ditt torn med mekaniken för förstärkning eller rädda ord för att förhindra kollaps',
      'Förstöra rivalernas torn och råna deras mynt i realtids-PvP-strider',
      'Tävla i den dagliga klättringen med unika utmaningar, samma bräde världen över',
    ],
    faq: [
      {
        question: 'Vad är Word Tower?',
        answer:
          'Word Tower är ett gratis ordpusselspel där du stavar ord för att lägga till våningar i ditt torn, tjäna mynt och tävla mot rivaler. Bygg det högsta tornet, uppgradera ditt distrikt och klättra på den dagliga globala topplistan.',
      },
      {
        question: 'Hur fungerar den dagliga klättringen?',
        answer:
          'Den dagliga klättringen är en ny utmaning var 24:e timme med ett unikt bräde och en topplista som delas världen över. Stava de längsta orden för att klättra högre och få en plats på de globala dagliga rankingarna.',
      },
      {
        question: 'Hur fungerar tornuppgraderingarna?',
        answer:
          'Tjäna mynt från omgångar och spendera dem på att låsa upp permanenta uppgraderingar i ditt tornverkstad: fundament (stabilare torn), kran (bredare perfekt fönster), valv (mer mynt), försäkring (extra sköldar), och landmärke (högre poäng). Maximerade uppgraderingar låser upp nya distrikt.',
      },
      {
        question: 'Kan jag överfalla andra spelare?',
        answer:
          'Ja! Förstör rivalernas torn genom att stava ord för att slå ner deras våningar och stjäla mynt. Starkare torn tjänar mer mynt och belöningar. Försvar dig själv med sköldar som tjänas in från lådor.',
      },
      {
        question: 'Är Word Tower gratis?',
        answer:
          'Helt gratis! Spela obegränsade omgångar, låsa upp uppgraderingar med mynt du tjänar, och tävla på topplisorna utan några betalmurar eller annonser. Ingen nedladdning eller registrering krävs.',
      },
    ],
  },
  ja: {
    title: 'ワードタワー - 単語を積み上げてタワーを建築 | 無料ゲーム',
    description:
      '単語を綴ってタワーを積み上げよう！ワードタワーは、単語を積み重ねてコインを稼ぎ、アップグレードをアンロックして毎日のランキングを登ろう高速ワードパズルゲーム。無料でプレイ、ダウンロード不要。世界中の友人やライバルと競い合おう。',
    features: [
      '単語を綴ってフロアを追加し、タワーをどんどん高く建築',
      '各ラウンドでコインを獲得し、永続的なタワーアップグレード（基礎、クレーン、金庫、シールド）をアンロック',
      '補強メカニックまたは救出ワードでタワーを安定させ、崩壊を防止',
      'リアルタイムPvP戦でライバルのタワーを破壊してコインを奪う',
      '世界中で共有される毎日のランキングに登ろう、ユニークなチャレンジに挑戦',
    ],
    faq: [
      {
        question: 'ワードタワーとは何ですか？',
        answer:
          'ワードタワーは、単語を綴ってタワーにフロアを追加し、コインを稼ぎ、ライバルと競うことができる無料のワードパズルゲーム。最も高いタワーを建築し、地区をアップグレードして、毎日のグローバルランキングを登ろう。',
      },
      {
        question: 'デイリークライムはどのように機能しますか？',
        answer:
          'デイリークライムは24時間ごとにユニークなボード日当たりグローバルランキングを持つ新しいチャレンジです。最長の単語を綴ってより高いフロアに到達し、毎日のグローバルランキングにスポットを獲得しましょう。',
      },
      {
        question: 'タワーアップグレードはどのように機能しますか？',
        answer:
          'ラウンドからコインを稼ぎ、タワーワークショップで永続的なアップグレードをアンロック：基礎（より安定したタワー）、クレーン（より広い完璧なウィンドウ）、金庫（より多くのコイン）、保険（追加シールド）、ランドマーク（より高いスコア）。最大化されたアップグレードは新しい地区をアンロックします。',
      },
      {
        question: '他のプレイヤーを襲撃できますか？',
        answer:
          'はい。ライバルのタワーを破壊して、単語を綴って彼らのフロアを倒し、コインを盗みましょう。強力なタワーはより多くのコインと報酬を稼ぎます。クレートから獲得したシールドで自分を守ってください。',
      },
      {
        question: 'ワードタワーは無料ですか？',
        answer:
          '完全に無料です。無制限のラウンドをプレイし、稼いだコインでアップグレードをアンロックし、支払い壁や広告なしでランキングで競う。ダウンロードまたはサインアップは必要ありません。',
      },
    ],
  },
  es: {
    title: 'Word Tower - Apila palabras para construir tu torre | Juego gratis',
    description:
      '¡Deletrea palabras para construir la torre más alta! Word Tower es un juego rápido de rompecabezas de palabras donde apila palabras, gana monedas, desbloquea mejoras y sube en el ranking diario. Gratis para jugar, sin descargas requeridas. Compite con amigos y rivales en todo el mundo.',
    features: [
      'Deletrea palabras para agregar pisos y construye tu torre cada vez más alta',
      'Gana monedas por ronda y desbloquea mejoras permanentes de la torre (cimientos, grúas, bóvedas, escudos)',
      'Estabiliza tu torre con el mecanismo de refuerzo o palabras de rescate para evitar el colapso',
      'Destruye torres rivales y roba sus monedas en batallas PvP en tiempo real',
      'Compite en la escalada diaria con desafíos únicos, tablero compartido en todo el mundo',
    ],
    faq: [
      {
        question: '¿Qué es Word Tower?',
        answer:
          'Word Tower es un juego de rompecabezas de palabras gratuito donde deletreas palabras para agregar pisos a tu torre, ganas monedas y compites contra rivales. Construye la torre más alta, mejora tu distrito y sube en el ranking diario global.',
      },
      {
        question: '¿Cómo funciona la escalada diaria?',
        answer:
          'La escalada diaria es un nuevo desafío cada 24 horas con un tablero único y un ranking compartido en todo el mundo. Deletrea las palabras más largas para subir más alto y ganar un lugar en los rankings diarios globales.',
      },
      {
        question: '¿Cómo funcionan las mejoras de la torre?',
        answer:
          'Gana monedas de las rondas y gástalas en desbloquear mejoras permanentes en tu taller de torres: cimiento (torre más estable), grúa (ventana perfecta más ancha), bóveda (más monedas), seguro (escudos adicionales), e hito (puntuación más alta). Las mejoras maximizadas desbloquean nuevos distritos.',
      },
      {
        question: '¿Puedo atacar a otros jugadores?',
        answer:
          '¡Sí! Destruye las torres de los rivales deletreando palabras para derribar sus pisos y robar monedas. Las torres más fuertes ganan más monedas y recompensas. Defiéndete con escudos ganados de cajas.',
      },
      {
        question: '¿Es Word Tower gratis?',
        answer:
          '¡Completamente gratis! Juega rondas ilimitadas, desbloquea mejoras con monedas que ganes, y compite en rankings sin muros de pago ni anuncios. No requiere descarga ni registro.',
      },
    ],
  },
  ru: {
    title: 'Word Tower — Складывайте слова, чтобы построить свою башню | Бесплатная игра',
    description:
      'Складывайте слова для самой высокой башни! Word Tower — это быстрая словесная головоломка, где вы складываете слова, зарабатываете монеты, открываете улучшения и поднимаетесь по дневному рейтингу. Играйте бесплатно, без загрузок. Соревнуйтесь с друзьями и противниками по всему миру.',
    features: [
      'Составляйте слова, чтобы добавить этажи и построить башню выше и выше',
      'Зарабатывайте монеты за раунд и открывайте постоянные улучшения башни (фундаменты, краны, хранилища, щиты)',
      'Стабилизируйте башню с помощью механизма крепления или спасательных слов, чтобы предотвратить коллапс',
      'Разрушайте вражеские башни и крадите их монеты в боях PvP в реальном времени',
      'Соревнуйтесь в ежедневном восхождении с уникальными испытаниями, одна доска на весь мир',
    ],
    faq: [
      {
        question: 'Что такое Word Tower?',
        answer:
          'Word Tower — это бесплатная словесная головоломка, где вы складываете слова, добавляя этажи в башню, зарабатываете монеты и соревнуетесь с противниками. Постройте самую высокую башню, улучшайте свой район и поднимайтесь по глобальному дневному рейтингу.',
      },
      {
        question: 'Как работает ежедневное восхождение?',
        answer:
          'Ежедневное восхождение — это новое испытание каждые 24 часа с уникальной доской и рейтингом, общим для всего мира. Составляйте самые длинные слова, чтобы подняться выше и получить место в глобальных дневных рейтингах.',
      },
      {
        question: 'Как работают улучшения башни?',
        answer:
          'Зарабатывайте монеты в раундах и тратьте их на открытие постоянных улучшений в мастерской башни: фундамент (более устойчивая башня), кран (более широкое идеальное окно), хранилище (больше монет), страхование (дополнительные щиты), ориентир (более высокий балл). Максимальные улучшения открывают новые районы.',
      },
      {
        question: 'Могу ли я нападать на других игроков?',
        answer:
          'Да! Разрушайте вражеские башни, составляя слова, чтобы сбить их этажи и украсть монеты. Более мощные башни приносят больше монет и наград. Защищайте себя щитами, полученными из ящиков.',
      },
      {
        question: 'Бесплатна ли Word Tower?',
        answer:
          'Совершенно бесплатно! Играйте в неограниченные раунды, открывайте улучшения с помощью монет, которые вы зарабатываете, и соревнуйтесь в рейтингах без платежей и объявлений. Загрузка и регистрация не требуются.',
      },
    ],
  },
};

export default async function WordTowerV2Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale] || seoContent.en;
  const origin = 'https://www.lexiclash.live';

  // Load localized playLabel
  const t = (await loadTranslation(locale as 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru')) as Record<string, any>;
  const playLabel = t?.seo?.wordTowerV2?.playLabel || 'Play';

  return (
    <>
      <VideoGameJsonLd
        mode="wordTowerV2"
        locale={locale}
        name={content.title}
        description={content.description}
        playMode="SinglePlayer"
        numberOfPlayers={{ minValue: 1, maxValue: 1 }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'LexiClash', url: `${origin}/${locale}` },
          { name: content.title, url: `${origin}/${locale}/word-tower` },
        ]}
      />
      <FaqPageJsonLd faqs={content.faq.map(faq => ({ q: faq.question, a: faq.answer }))} />
      <WordTowerV2PageClient />
      <GamePageSeoContent
        title={content.title}
        description={content.description}
        features={content.features}
        faq={content.faq}
        cta={<ModeLandingPlayButton mode="word-tower" href={`/${locale}/word-tower`} label={playLabel} />}
      />
    </>
  );
}
