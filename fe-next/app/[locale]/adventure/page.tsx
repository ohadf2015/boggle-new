import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { VideoGameJsonLd } from '@/components/seo/VideoGameJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { FaqPageJsonLd } from '@/components/seo/FaqPageJsonLd';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import { ModeLandingPlayButton } from '@/components/seo/ModeLandingPlayButton';
import { loadTranslation } from '@/translations/loadTranslation';
import AdventurePageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  // Adventure is now GA — publicly indexed for search and AdSense review.
  return generatePageMetadata({ seoKey: 'adventure', path: '/adventure', locale, noIndex: false });
}

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Word Adventure Game: a 70-level word puzzle RPG with boss battles',
    description:
      'LexiClash Adventure is a free word puzzle RPG with 70 levels across 10 worlds. Every world has seven levels: the fourth is an elite fight and the seventh is the world boss, and you hit them by spelling words. Each world also adds one new rule, such as fog that hides the board, bombs you have to defuse, or a chain where every word starts with the last letter of the one before. Beat a boss and you win that world\'s tile skin.',
    features: [
      '70 levels in 10 worlds, seven levels per world',
      'An elite fight at level 4 and a boss at level 7 of every world, and each word you spell is a hit',
      'A new rule in each world: hidden words, word chains, fog, bombs, long words only, a 60-second rush, a giant 6x6 board, an ambush, a blackout and a finale',
      'Up to three stars on every level',
      'A new tile skin for every world boss you beat',
    ],
    faq: [
      {
        question: 'What is LexiClash Adventure?',
        answer:
          'A free single-player word puzzle RPG. You work through 70 levels in 10 worlds, finding words on a letter grid to reach a target score, uncover hidden words or empty an enemy\'s health before the clock runs out.',
      },
      {
        question: 'Is the word adventure game free?',
        answer:
          'Yes. All 70 levels and every boss are free to play in your browser, with nothing to download.',
      },
      {
        question: 'How do the boss battles work?',
        answer:
          'The fourth level of each world is an elite and the seventh is the world boss. Every word you spell deals damage, and the enemy hits back on its turns, so you have to empty its health bar before your time runs out.',
      },
      {
        question: 'What changes from world to world?',
        answer:
          'Each world brings one new rule. Hidden words give you only the first letter, in a chain every word starts with the last letter of the word before, fog hides every tile except the ones next to your last word, and each bomb that goes off costs you 4 seconds. Later worlds add a long-words-only rule, a 60-second rush, a giant 6x6 board, an early elite ambush, a blackout and a 75-second finale.',
      },
      {
        question: 'What do I win?',
        answer:
          'The first time you beat a world\'s boss you unlock a tile skin themed on that world, and you can play with it on your board.',
      },
    ],
  },
  he: {
    title: 'משחק הרפתקאות מילים: RPG של חידות מילים עם 70 שלבים וקרבות בוסים',
    description:
      'LexiClash Adventure הוא משחק RPG חינמי של חידות מילים, עם 70 שלבים ב-10 עולמות. בכל עולם יש שבעה שלבים: בשלב הרביעי מחכה אויב עילית ובשביעי הבוס של העולם, ואתם פוגעים בהם בכל מילה שאתם מאייתים. כל עולם מוסיף גם חוק חדש, למשל ערפל שמסתיר את הלוח, פצצות שצריך לנטרל או שרשרת שבה כל מילה מתחילה באות האחרונה של הקודמת. מי שמנצח בוס מקבל את עיצוב האריחים של אותו עולם.',
    features: [
      '70 שלבים ב-10 עולמות, שבעה שלבים בכל עולם',
      'קרב עילית בשלב 4 ובוס בשלב 7 של כל עולם, וכל מילה שאתם מאייתים היא מכה',
      'חוק חדש בכל עולם: מילים נסתרות, שרשרת מילים, ערפל, פצצות, רק מילים ארוכות, ריצה של 60 שניות, לוח ענק של 6x6, מארב, האפלה וגמר',
      'עד שלושה כוכבים בכל שלב',
      'עיצוב אריחים חדש על כל בוס שאתם מנצחים',
    ],
    faq: [
      {
        question: 'מה זה LexiClash Adventure?',
        answer:
          'משחק RPG חינמי של חידות מילים לשחקן יחיד. עוברים 70 שלבים ב-10 עולמות ומוצאים מילים בלוח אותיות כדי להגיע לניקוד, לחשוף מילים נסתרות או לרוקן את הבריאות של אויב לפני שהזמן נגמר.',
      },
      {
        question: 'האם משחק הרפתקאות המילים חינמי?',
        answer:
          'כן. כל 70 השלבים וכל הבוסים פתוחים בחינם בדפדפן, בלי הורדה.',
      },
      {
        question: 'איך עובדים קרבות הבוסים?',
        answer:
          'השלב הרביעי בכל עולם הוא אויב עילית והשביעי הוא הבוס. כל מילה שאתם מאייתים פוגעת בו, והוא מחזיר מכות בתורות שלו, אז צריך לרוקן לו את פס הבריאות לפני שהשעון נגמר.',
      },
      {
        question: 'מה משתנה מעולם לעולם?',
        answer:
          'כל עולם מביא חוק אחד חדש. במילים נסתרות מקבלים רק את האות הראשונה, בשרשרת כל מילה מתחילה באות האחרונה של הקודמת, הערפל מסתיר את כל האריחים חוץ מאלה שליד המילה האחרונה, וכל פצצה שמתפוצצת עולה 4 שניות. בעולמות המאוחרים מחכים רק מילים ארוכות, ריצה של 60 שניות, לוח ענק של 6x6, מארב מוקדם, האפלה וגמר של 75 שניות.',
      },
      {
        question: 'מה מקבלים על ניצחון?',
        answer:
          'בפעם הראשונה שמנצחים את הבוס של עולם נפתח עיצוב אריחים בסגנון של אותו עולם, ואפשר לשחק איתו על הלוח.',
      },
    ],
  },
  sv: {
    title: 'Ordäventyrsspel: ett RPG-ordpussel med 70 nivåer och bosstrider',
    description:
      'LexiClash Adventure är ett gratis RPG med ordpussel: 70 nivåer i 10 världar. Varje värld har sju nivåer, där den fjärde är en elitfiende och den sjunde världens boss, och du skadar dem genom att bilda ord. Varje värld lägger också till en ny regel, till exempel dimma som döljer brädet, bomber som måste desarmeras eller en kedja där varje ord börjar på sista bokstaven i det förra. Besegrar du en boss vinner du den världens brickdesign.',
    features: [
      '70 nivåer i 10 världar, sju nivåer per värld',
      'En elitstrid på nivå 4 och en boss på nivå 7 i varje värld, och varje ord du bildar är ett slag',
      'En ny regel i varje värld: dolda ord, ordkedjor, dimma, bomber, bara långa ord, 60 sekunders rush, ett stort 6x6-bräde, ett bakhåll, mörkläggning och en final',
      'Upp till tre stjärnor på varje nivå',
      'En ny brickdesign för varje boss du besegrar',
    ],
    faq: [
      {
        question: 'Vad är LexiClash Adventure?',
        answer:
          'Ett gratis RPG med ordpussel för en spelare. Du tar dig igenom 70 nivåer i 10 världar och hittar ord på ett bokstavsbräde för att nå en poänggräns, hitta dolda ord eller tömma en fiendes hälsa innan tiden tar slut.',
      },
      {
        question: 'Är ordäventyret gratis?',
        answer:
          'Ja. Alla 70 nivåer och alla bossar är gratis att spela i webbläsaren, utan nedladdning.',
      },
      {
        question: 'Hur fungerar bosstriderna?',
        answer:
          'Den fjärde nivån i varje värld är en elitfiende och den sjunde är världens boss. Varje ord du bildar gör skada, och fienden slår tillbaka på sina drag, så du måste tömma dess hälsomätare innan klockan går ut.',
      },
      {
        question: 'Vad ändras från värld till värld?',
        answer:
          'Varje värld har en ny regel. Vid dolda ord får du bara första bokstaven, i en kedja börjar varje ord på sista bokstaven i det förra, dimman döljer alla brickor utom de närmast ditt senaste ord, och varje bomb som exploderar kostar 4 sekunder. Senare världar har bara långa ord, en rush på 60 sekunder, ett stort 6x6-bräde, ett tidigt bakhåll, mörkläggning och en final på 75 sekunder.',
      },
      {
        question: 'Vad vinner man?',
        answer:
          'Första gången du besegrar en världs boss låser du upp en brickdesign i den världens stil, som du kan använda på ditt bräde.',
      },
    ],
  },
  ja: {
    title: 'ワードアドベンチャーゲーム：70ステージとボス戦のRPGワードパズル',
    description:
      'LexiClash Adventureは、10のワールドに70ステージがある無料のRPGワードパズルです。各ワールドは7ステージで、4ステージ目にエリート、7ステージ目にワールドボスが登場し、単語を作るたびにダメージを与えます。ワールドごとに新しいルールがひとつ加わり、盤面を隠す霧、解除しないと爆発する爆弾、前の単語の最後の文字から始めるしりとりなどがあります。ボスを倒すと、そのワールドのタイルスキンがもらえます。',
    features: [
      '10のワールドに70ステージ（各ワールド7ステージ）',
      '各ワールドの4ステージ目はエリート戦、7ステージ目はボス戦。作った単語がそのまま攻撃になります',
      'ワールドごとの新ルール：隠し単語、しりとり、霧、爆弾、長い単語のみ、60秒ラッシュ、6x6の大きな盤面、奇襲、暗闇、フィナーレ',
      '各ステージで最大3つの星',
      '倒したボスごとに新しいタイルスキン',
    ],
    faq: [
      {
        question: 'LexiClash Adventureとは？',
        answer:
          '1人で遊ぶ無料のRPGワードパズルです。10のワールドにある70ステージを進み、文字の盤面から単語を見つけて、制限時間内に目標スコアの達成、隠し単語の発見、敵の体力を削り切ることを目指します。',
      },
      {
        question: 'ワードアドベンチャーは無料ですか？',
        answer:
          'はい。70ステージとすべてのボス戦をブラウザで無料で遊べます。ダウンロードは不要です。',
      },
      {
        question: 'ボス戦はどう進みますか？',
        answer:
          '各ワールドの4ステージ目がエリート、7ステージ目がワールドボスです。単語を作るたびにダメージを与えますが、敵も自分のターンに反撃してくるので、時間切れになる前に体力ゲージを削り切りましょう。',
      },
      {
        question: 'ワールドごとに何が変わりますか？',
        answer:
          '各ワールドに新しいルールがひとつあります。隠し単語では最初の文字だけがヒントになり、しりとりでは前の単語の最後の文字から始め、霧では直前の単語の周りのタイルしか見えず、爆弾が爆発するたびに4秒失います。後半のワールドでは、4文字以上の単語のみ、60秒のラッシュ、6x6の大きな盤面、序盤の奇襲、暗闇、75秒のフィナーレが待っています。',
      },
      {
        question: '何がもらえますか？',
        answer:
          'ワールドのボスを初めて倒すと、そのワールドをテーマにしたタイルスキンが解放され、盤面で使えます。',
      },
    ],
  },
  es: {
    title: 'Juego de aventura de palabras: un RPG de puzles con 70 niveles y jefes',
    description:
      'LexiClash Adventure es un RPG gratuito de puzles de palabras con 70 niveles repartidos en 10 mundos. Cada mundo tiene siete niveles: en el cuarto te espera un enemigo de élite y en el séptimo el jefe del mundo, y les haces daño con cada palabra que formas. Cada mundo añade además una regla nueva, como una niebla que oculta el tablero, bombas que tienes que desactivar o una cadena en la que cada palabra empieza por la última letra de la anterior. Si vences a un jefe, ganas el diseño de fichas de ese mundo.',
    features: [
      '70 niveles en 10 mundos, siete por mundo',
      'Un combate de élite en el nivel 4 y un jefe en el nivel 7 de cada mundo, y cada palabra que formas es un golpe',
      'Una regla nueva en cada mundo: palabras ocultas, cadenas, niebla, bombas, solo palabras largas, contrarreloj de 60 segundos, un tablero gigante de 6x6, emboscada, apagón y final',
      'Hasta tres estrellas en cada nivel',
      'Un diseño de fichas nuevo por cada jefe que derrotas',
    ],
    faq: [
      {
        question: '¿Qué es LexiClash Adventure?',
        answer:
          'Un RPG gratuito de puzles de palabras para un jugador. Avanzas por 70 niveles en 10 mundos buscando palabras en un tablero de letras para llegar a una puntuación, descubrir palabras ocultas o dejar sin vida a un enemigo antes de que se acabe el tiempo.',
      },
      {
        question: '¿El juego de aventura de palabras es gratis?',
        answer:
          'Sí. Los 70 niveles y todos los jefes se juegan gratis en el navegador, sin descargar nada.',
      },
      {
        question: '¿Cómo funcionan los combates contra jefes?',
        answer:
          'El cuarto nivel de cada mundo es un enemigo de élite y el séptimo es el jefe. Cada palabra que formas le hace daño, pero él también ataca en sus turnos, así que tienes que vaciar su barra de vida antes de que se acabe el reloj.',
      },
      {
        question: '¿Qué cambia de un mundo a otro?',
        answer:
          'Cada mundo trae una regla nueva. En palabras ocultas solo ves la primera letra, en la cadena cada palabra empieza por la última letra de la anterior, la niebla esconde todas las fichas menos las que están junto a tu última palabra y cada bomba que explota te quita 4 segundos. Los últimos mundos añaden solo palabras largas, una contrarreloj de 60 segundos, un tablero gigante de 6x6, una emboscada temprana, un apagón y una final de 75 segundos.',
      },
      {
        question: '¿Qué se gana?',
        answer:
          'La primera vez que vences al jefe de un mundo desbloqueas un diseño de fichas con el estilo de ese mundo, que puedes usar en tu tablero.',
      },
    ],
  },
  ru: {
    title: 'Игра в слова-приключение: RPG-головоломка с 70 уровнями и боссами',
    description:
      'LexiClash Adventure — бесплатная RPG-головоломка со словами: 70 уровней в 10 мирах. В каждом мире семь уровней: на четвёртом вас ждёт элитный враг, на седьмом босс мира, и каждое составленное слово наносит им урон. Каждый мир добавляет новое правило, например туман, который скрывает поле, бомбы, которые нужно обезвредить, или цепочку, где каждое слово начинается на последнюю букву предыдущего. Победите босса, и получите оформление плиток этого мира.',
    features: [
      '70 уровней в 10 мирах, по семь в каждом',
      'Бой с элитным врагом на 4-м уровне и босс на 7-м уровне каждого мира, и каждое слово — это удар',
      'Новое правило в каждом мире: скрытые слова, цепочка слов, туман, бомбы, только длинные слова, 60-секундный рывок, большое поле 6x6, засада, затемнение и финал',
      'До трёх звёзд за каждый уровень',
      'Новое оформление плиток за каждого побеждённого босса',
    ],
    faq: [
      {
        question: 'Что такое LexiClash Adventure?',
        answer:
          'Бесплатная RPG-головоломка со словами для одного игрока. Вы проходите 70 уровней в 10 мирах и ищете слова на поле из букв, чтобы набрать нужные очки, найти скрытые слова или обнулить здоровье врага, пока не вышло время.',
      },
      {
        question: 'Бесплатна ли игра в слова-приключение?',
        answer:
          'Да. Все 70 уровней и все боссы доступны бесплатно в браузере, ничего скачивать не нужно.',
      },
      {
        question: 'Как устроены бои с боссами?',
        answer:
          'Четвёртый уровень каждого мира — элитный враг, седьмой — босс. Каждое ваше слово наносит урон, но враг тоже бьёт в свои ходы, поэтому его полоску здоровья нужно опустошить до того, как закончится время.',
      },
      {
        question: 'Что меняется от мира к миру?',
        answer:
          'В каждом мире появляется одно новое правило. В скрытых словах вы видите только первую букву, в цепочке каждое слово начинается на последнюю букву предыдущего, туман скрывает все плитки, кроме тех, что рядом с последним словом, а каждый взрыв бомбы отнимает 4 секунды. В последних мирах ждут только длинные слова, 60-секундный рывок, большое поле 6x6, ранняя засада, затемнение и 75-секундный финал.',
      },
      {
        question: 'Что можно выиграть?',
        answer:
          'Победив босса мира в первый раз, вы открываете оформление плиток в стиле этого мира и можете играть с ним на своём поле.',
      },
    ],
  },
};

export default async function AdventurePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale] || seoContent.en;
  const origin = 'https://www.lexiclash.live';

  // Load localized playLabel
  const t = (await loadTranslation(locale as 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru')) as Record<string, any>;
  const playLabel = t?.seo?.adventure?.playLabel || 'Play';

  return (
    <>
      <VideoGameJsonLd
        mode="adventure"
        locale={locale}
        name={content.title}
        description={content.description}
        playMode="SinglePlayer"
        numberOfPlayers={{ minValue: 1, maxValue: 1 }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'LexiClash', url: `${origin}/${locale}` },
          { name: content.title, url: `${origin}/${locale}/adventure` },
        ]}
      />
      <FaqPageJsonLd faqs={content.faq.map(faq => ({ q: faq.question, a: faq.answer }))} />
      <AdventurePageClient />
      <GamePageSeoContent
        title={content.title}
        description={content.description}
        features={content.features}
        faq={content.faq}
        cta={<ModeLandingPlayButton mode="adventure" href={`/${locale}/adventure`} label={playLabel} />}
      />
    </>
  );
}
