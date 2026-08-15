import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { GuidesCalloutLink } from '@/components/seo/GuidesCalloutLink';
import RulesPageClient from './PageClient';

export const revalidate = 86400;

const seoContent: Record<string, {
  title: string;
  description: string;
  features: string[];
  faq: { question: string; answer: string }[];
}> = {
  en: {
    title: 'LexiClash Rules — How to Play Every Game Mode',
    description:
      'Learn how to play LexiClash, the free multiplayer word game. This page covers the complete rules for all six game modes: Classic, Word Hunt, Blast, Wheel Rush, Adventure, and Brain Training. Understand scoring, combos, time bonuses, and how words are validated against our dictionaries. Whether you are a first-time player or a competitive veteran looking to master advanced strategies, these rules explain everything you need to know.',
    features: [
      'Classic Mode: Find words on a 4×4 or 5×5 grid within a timed round — longer words score exponentially more points',
      'Word Hunt Mode: Themed word challenges with bonus multipliers for matching the hidden category',
      'Blast Mode: Fast-paced explosive rounds where finding words clears tiles and triggers chain reactions',
      'Wheel Rush Mode: Spin the letter wheel and race to form as many words as possible from the selected letters',
      'Adventure Mode: 50+ progressive levels with boss fights, star ratings, and story progression',
      'Brain Training: Five cognitive drills — Lightning Round, Rare Gems, Combo Master, Pattern Switcher, Memory Hunt',
      'Scoring system: Points scale with word length (3-letter = 1pt, 4 = 1, 5 = 2, 6 = 3, 7 = 5, 8+ = 11+)',
      'Combo chains: Find words in quick succession to earn multiplier bonuses up to 5×',
      'Dictionary validation: Every word checked against curated dictionaries for English, Hebrew, Swedish, Japanese, and Spanish',
      'Fair play: All players see the same grid, same timer, same dictionary — skill decides the winner',
    ],
    faq: [
      {
        question: 'How does scoring work in LexiClash?',
        answer:
          'Scoring is based on word length. Three and four-letter words score 1 point each. Five-letter words score 2 points, six-letter words score 3, seven-letter words score 5, and eight-letter words or longer score 11 points or more. Combo chains multiply your score when you find words in rapid succession.',
      },
      {
        question: 'What dictionaries does LexiClash use?',
        answer:
          'LexiClash uses curated word lists validated for each supported language. English uses a comprehensive dictionary of common and uncommon words. Hebrew, Swedish, Japanese, and Spanish each have dedicated dictionaries suited to their language structure. Proper nouns, abbreviations, and slang are excluded.',
      },
      {
        question: 'How do I connect letters to form a word?',
        answer:
          'Swipe across adjacent letters (horizontally, vertically, or diagonally) on mobile, or click and drag on desktop. Each letter tile can only be used once per word. Letters must be directly adjacent to each other — you cannot skip tiles.',
      },
      {
        question: 'What is a combo chain and how do I get one?',
        answer:
          'A combo chain builds when you find multiple valid words in quick succession without long pauses. The combo multiplier increases from 1× up to 5× as you chain words faster. The chain breaks if you wait too long between words or submit an invalid word.',
      },
      {
        question: 'Can I play LexiClash in different languages?',
        answer:
          'Yes — LexiClash supports five languages: English, Hebrew (with full right-to-left interface support), Swedish, Japanese, and Spanish. Each language has its own validated dictionary and the entire game interface is translated. Switch languages from the settings menu at any time.',
      },
    ],
  },
  he: {
    title: 'חוקי LexiClash — איך משחקים בכל מצבי המשחק',
    description:
      'למדו איך לשחק ב-LexiClash, משחק המילים המרובה משתתפים החינמי. דף זה מכסה את החוקים המלאים לכל שישה מצבי המשחק: קלאסי, ציד מילים, בלאסט, גלגל מילים, הרפתקה ואימון מוח. הבינו את מערכת הניקוד, הקומבואים, בונוסי הזמן ואיך מילים מאומתות מול המילונים שלנו.',
    features: [
      'מצב קלאסי: מצאו מילים על לוח 4×4 או 5×5 בסבב מתוזמן',
      'ניקוד: נקודות עולות עם אורך המילה — מילים ארוכות שוות הרבה יותר',
      'שרשראות קומבו: מצאו מילים ברצף מהיר לבונוס מכפיל עד 5×',
      'אימות מילון: כל מילה נבדקת מול מילונים מאורגנים לכל שפה',
      'משחק הוגן: כל השחקנים רואים את אותו לוח, אותו טיימר, אותו מילון',
    ],
    faq: [
      {
        question: 'איך עובד הניקוד ב-LexiClash?',
        answer:
          'הניקוד מבוסס על אורך המילה. מילים בנות 3-4 אותיות שוות נקודה אחת. מילים בנות 5 אותיות שוות 2 נקודות, 6 אותיות — 3 נקודות, 7 אותיות — 5 נקודות, ו-8+ אותיות שוות 11 נקודות ומעלה.',
      },
      {
        question: 'איך מחברים אותיות ליצירת מילה?',
        answer:
          'החליקו על אותיות סמוכות (אופקית, אנכית או אלכסונית) בנייד, או לחצו וגררו בדסקטופ. כל אות אפשר להשתמש בה רק פעם אחת לכל מילה.',
      },
    ],
  },
  sv: {
    title: 'LexiClash-regler — Hur man spelar alla spellägen',
    description:
      'Lär dig spela LexiClash, det gratis multiplayer-ordspelet. Den här sidan täcker de kompletta reglerna för alla sex spellägen: Klassiskt, Ordjakt, Blast, Ordhjul, Äventyr och Hjärnträning. Förstå poängsättning, kombos, tidsbonusar och ordvalidering.',
    features: [
      'Klassiskt läge: Hitta ord på ett 4×4 eller 5×5 rutnät inom en tidsbegränsad runda',
      'Poäng skalas med ordlängd — längre ord ger exponentiellt fler poäng',
      'Kombokedjor: Hitta ord i snabb följd för multiplikatorbonus upp till 5×',
      'Ordboksvalidering: Varje ord kontrolleras mot kurerade ordlistor för varje språk',
      'Rättvist spel: Alla spelare ser samma rutnät, samma timer, samma ordbok',
    ],
    faq: [
      {
        question: 'Hur fungerar poängsättningen i LexiClash?',
        answer:
          'Poängen baseras på ordlängd. Tre- och fyrabokstavsord ger 1 poäng vardera. Fembokstavsord ger 2 poäng, sex ger 3, sju ger 5 och åtta bokstäver eller fler ger 11+ poäng.',
      },
      {
        question: 'Hur kopplar jag ihop bokstäver för att bilda ett ord?',
        answer:
          'Svep över intilliggande bokstäver (horisontellt, vertikalt eller diagonalt) på mobilen, eller klicka och dra på datorn. Varje bokstav kan bara användas en gång per ord.',
      },
    ],
  },
  ja: {
    title: 'LexiClashルール — 全ゲームモードの遊び方',
    description:
      'LexiClashの遊び方を学びましょう。無料マルチプレイヤーワードゲームの全6モード（クラシック、ワードハント、ブラスト、ワードホイール、アドベンチャー、脳トレ）の完全なルールを解説します。スコアリング、コンボ、タイムボーナス、辞書バリデーションについて理解しましょう。',
    features: [
      'クラシックモード：タイムリミット内に4×4または5×5グリッドで単語を見つける',
      'スコアは単語の長さに応じて増加 — 長い単語ほど指数的に高得点',
      'コンボチェーン：素早く連続で単語を見つけると最大5倍のマルチプライヤーボーナス',
      '辞書バリデーション：各言語の厳選された辞書で全単語をチェック',
      'フェアプレイ：全プレイヤーが同じグリッド、同じタイマー、同じ辞書',
    ],
    faq: [
      {
        question: 'LexiClashのスコアリングはどう機能しますか？',
        answer:
          'スコアは単語の長さに基づきます。3-4文字の単語は各1ポイント。5文字は2ポイント、6文字は3ポイント、7文字は5ポイント、8文字以上は11ポイント以上です。',
      },
      {
        question: '文字をつなげて単語を作るには？',
        answer:
          'モバイルでは隣接する文字を（水平、垂直、斜めに）スワイプ、デスクトップではクリック＆ドラッグします。各文字は1単語につき1回のみ使用可能です。',
      },
    ],
  },
  es: {
    title: 'Reglas de LexiClash — Cómo jugar en todos los modos',
    description:
      'Aprende a jugar LexiClash, el juego de palabras multijugador gratuito. Esta página cubre las reglas completas para los seis modos de juego: Clásico, Caza de Palabras, Blast, Rueda de Palabras, Aventura y Entrenamiento Cerebral. Comprende la puntuación, los combos, los bonos de tiempo y la validación de palabras.',
    features: [
      'Modo Clásico: Encuentra palabras en un tablero 4×4 o 5×5 en una ronda cronometrada',
      'La puntuación escala con la longitud de la palabra — palabras más largas valen exponencialmente más',
      'Cadenas de combo: Encuentra palabras en rápida sucesión para bonus multiplicador hasta 5×',
      'Validación de diccionario: Cada palabra se verifica contra diccionarios curados para cada idioma',
      'Juego limpio: Todos los jugadores ven el mismo tablero, mismo temporizador, mismo diccionario',
    ],
    faq: [
      {
        question: '¿Cómo funciona la puntuación en LexiClash?',
        answer:
          'La puntuación se basa en la longitud de la palabra. Palabras de 3-4 letras valen 1 punto cada una. Palabras de 5 letras valen 2 puntos, de 6 letras valen 3, de 7 valen 5 y de 8+ letras valen 11 puntos o más.',
      },
      {
        question: '¿Cómo conecto letras para formar una palabra?',
        answer:
          'Desliza sobre letras adyacentes (horizontal, vertical o diagonalmente) en móvil, o haz clic y arrastra en escritorio. Cada letra solo puede usarse una vez por palabra.',
      },
    ],
  },
};

export default async function RulesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale] ?? seoContent.en;
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
  const breadcrumbItems = [
    { name: 'LexiClash', url: `https://www.lexiclash.live/${locale}` },
    { name: 'Rules', url: `https://www.lexiclash.live/${locale}/rules` },
  ];
  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <RulesPageClient />
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
