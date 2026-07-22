import type { Metadata } from 'next';
import GuidesIndexPageClient from './PageClient';
import { encodeJsonLd } from '@/lib/seo/leaderboardJsonLd';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SITE_URL = 'https://www.lexiclash.live';

const guidesSeoContent: Record<string, {
  title: string; description: string; features: string[];
  faq: { question: string; answer: string }[];
}> = {
  en: {
    title: 'LexiClash Strategy Guides — Master Every Game Mode',
    description: 'Expert strategy guides for LexiClash. Learn advanced techniques for Classic, Blast, and Word Hunt modes. Tips on word-finding, combo chains, grid scanning, and scoring strategies from top players.',
    features: [
      'Classic mode strategy — grid scanning patterns and high-value word targets',
      'Blast mode mastery — combo timing, chain multipliers, and explosive scoring',
      'Word Hunt tips — letter elimination, color clue interpretation, and guess optimization',
      'General word-finding techniques — prefixes, suffixes, and common letter patterns',
      'Scoring optimization — when to go for length vs. speed vs. combos',
    ],
    faq: [
      { question: 'What is the best strategy for Classic mode?', answer: 'Scan the grid systematically — start from corners and edges where longer words tend to hide. Look for common prefixes (UN-, RE-, PRE-) and suffixes (-ING, -TION, -ED) to quickly spot longer words.' },
      { question: 'How do combos work in Blast mode?', answer: 'Finding words in quick succession builds a combo multiplier. The faster you chain words, the higher the multiplier climbs. Focus on short 3-4 letter words to keep the combo going, then hit a long word for maximum points.' },
      { question: 'Are there guides for beginners?', answer: 'Yes — our guides cover basics to advanced. Start with the Classic mode guide to learn grid scanning, then progress to Blast and Word Hunt strategies as you improve.' },
    ],
  },
  he: {
    title: 'מדריכי אסטרטגיה — שלטו בכל מצב משחק',
    description: 'מדריכי אסטרטגיה מומחים ל-LexiClash. טכניקות מתקדמות לקלאסי, בלאסט וציד מילים.',
    features: [
      'אסטרטגיית מצב קלאסי — סריקת לוח ומציאת מילים ארוכות',
      'שליטה בבלאסט — תזמון קומבו ושרשרות',
      'טיפים לציד מילים — פירוש רמזי צבע',
      'טכניקות כלליות למציאת מילים — תחיליות, סיומות ותבניות אותיות נפוצות',
      'אופטימיזציית ניקוד — מתי ללכת על אורך מול מהירות מול קומבו',
    ],
    faq: [
      { question: 'מה האסטרטגיה הטובה ביותר למצב קלאסי?', answer: 'סרקו את הלוח בשיטתיות — התחילו מפינות וקצוות. חפשו תחיליות וסיומות נפוצות למציאת מילים ארוכות.' },
      { question: 'איך עובדים הקומבו במצב בלאסט?', answer: 'מציאת מילים ברצף מהיר בונה מכפיל קומבו. ככל שמשרשרים מהר יותר, המכפיל עולה. התמקדו במילים קצרות של 3-4 אותיות כדי לשמור על הקומבו, ואז הכו במילה ארוכה לניקוד מקסימלי.' },
      { question: 'האם יש מדריכים למתחילים?', answer: 'כן — המדריכים שלנו מכסים מהבסיסי ועד המתקדם. התחילו עם מדריך מצב קלאסי ללמידת סריקת לוח, ואז התקדמו לאסטרטגיות בלאסט וציד מילים.' },
    ],
  },
  sv: {
    title: 'Strategiguider — Bemästra Varje Spelmod',
    description: 'Expertstrategiguider för LexiClash. Avancerade tekniker för Klassiskt, Blast och Word Hunt.',
    features: [
      'Klassisk strategi — rutnätsskanning och höga ordmål',
      'Blast-mästerskap — kombotiming och kedjeeffekter',
      'Word Hunt-tips — ledtrådsanalys',
      'Allmänna ordletningstekniker — prefix, suffix och vanliga bokstavsmönster',
      'Poängoptimering — när du ska gå för längd vs. hastighet vs. kombos',
    ],
    faq: [
      { question: 'Vad är den bästa strategin för Klassiskt läge?', answer: 'Skanna rutnätet systematiskt — börja från hörn och kanter. Leta efter vanliga prefix och suffix.' },
      { question: 'Hur fungerar kombos i Blast-läge?', answer: 'Att hitta ord i snabb följd bygger en kombomultiplikator. Ju snabbare du kedjar ord, desto högre klättrar multiplikatorn. Fokusera på korta 3-4 bokstavsord för att hålla kombon igång, slå sedan ett långt ord för maxpoäng.' },
      { question: 'Finns det guider för nybörjare?', answer: 'Ja — guiderna täcker allt från grunderna till avancerat. Börja med guiden för Klassiskt läge för att lära dig rutnätsskanning, gå sedan vidare till Blast och Word Hunt.' },
    ],
  },
  ja: {
    title: '攻略ガイド — すべてのゲームモードをマスター',
    description: 'LexiClashのエキスパート攻略ガイド。クラシック、ブラスト、ワードハントの上級テクニック。',
    features: [
      'クラシック戦略 — グリッドスキャンと高得点ワード',
      'ブラストマスター — コンボタイミングとチェーン',
      'ワードハントのコツ — 色ヒント解釈',
      '単語発見の一般テクニック — 接頭辞、接尾辞、よく出る文字パターン',
      'スコア最適化 — 長さ・速さ・コンボのどれを優先すべきか',
    ],
    faq: [
      { question: 'クラシックモードの最良の戦略は？', answer: 'グリッドを体系的にスキャン — 角と端から始めましょう。一般的な接頭辞と接尾辞を探して長い単語を見つけましょう。' },
      { question: 'ブラストモードのコンボはどう機能しますか？', answer: '素早く連続して単語を見つけることでコンボマルチプライヤーが積み上がります。連鎖が速いほど倍率が上がります。3〜4文字の短い単語でコンボをつなぎ、長い単語でポイントを最大化しましょう。' },
      { question: '初心者向けのガイドはありますか？', answer: 'はい — 初心者から上級者まで対応しています。まずクラシックモードのガイドでグリッドスキャンを学び、次にブラストとワードハントの戦略へ進みましょう。' },
    ],
  },
  es: {
    title: 'Guías de Estrategia — Domina Cada Modo de Juego',
    description: 'Guías de estrategia experta para LexiClash. Técnicas avanzadas para Clásico, Blast y Word Hunt.',
    features: [
      'Estrategia Clásica — patrones de escaneo y palabras de alto valor',
      'Dominio de Blast — sincronización de combos y cadenas',
      'Consejos de Word Hunt — interpretación de pistas',
      'Técnicas generales de búsqueda de palabras — prefijos, sufijos y patrones de letras',
      'Optimización de puntuación — cuándo elegir longitud vs. velocidad vs. combos',
    ],
    faq: [
      { question: '¿Cuál es la mejor estrategia para el modo Clásico?', answer: 'Escanea la cuadrícula sistemáticamente — comienza por esquinas y bordes. Busca prefijos y sufijos comunes para encontrar palabras largas.' },
      { question: '¿Cómo funcionan los combos en el modo Blast?', answer: 'Encontrar palabras en rápida sucesión construye un multiplicador de combo. Cuanto más rápido encadenas palabras, más alto sube el multiplicador. Enfócate en palabras cortas de 3-4 letras para mantener el combo activo, luego golpea con una palabra larga para máximos puntos.' },
      { question: '¿Hay guías para principiantes?', answer: 'Sí — nuestras guías cubren desde lo básico hasta lo avanzado. Comienza con la guía del modo Clásico para aprender a escanear la cuadrícula, luego avanza a las estrategias de Blast y Word Hunt.' },
    ],
  },
};

const metaTitles: Record<string, string> = {
  en: 'Strategy Guides - Master Every Game Mode | LexiClash',
  he: 'מדריכי אסטרטגיה - שלטו בכל מצב משחק | לקסיקלאש',
  sv: 'Strategiguider - Bemestra Varje Spelmod | LexiClash',
  ja: '攻略ガイド - すべてのゲームモードをマスター | LexiClash',
  es: 'Guias de Estrategia - Domina Cada Modo de Juego | LexiClash',
};

const metaDescriptions: Record<string, string> = {
  en: 'Expert strategy guides for LexiClash Classic, Blast, and Word Hunt modes. Tips, techniques, and scoring strategies from top players.',
  he: 'מדריכי אסטרטגיה מומחים למצבי קלאסי, בלאסט וציד מילים של לקסיקלאש.',
  sv: 'Expertstrategiguider for LexiClash Klassiskt, Blast och Word Hunt-lage.',
  ja: 'LexiClashクラシック、ブラスト、ワードハントモードのエキスパート攻略ガイド。',
  es: 'Guias de estrategia experta para los modos Clasico, Blast y Word Hunt de LexiClash.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return {
    title, description,
    openGraph: { type: 'website', title, description, url: `${SITE_URL}/${locale}/guides`, siteName: 'LexiClash' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: `${SITE_URL}/${locale}/guides`,
      languages: {
        'x-default': `${SITE_URL}/en/guides`, he: `${SITE_URL}/he/guides`,
        en: `${SITE_URL}/en/guides`, sv: `${SITE_URL}/sv/guides`,
        ja: `${SITE_URL}/ja/guides`, es: `${SITE_URL}/es/guides`,
        ru: `${SITE_URL}/ru/guides`,
        'en-IL': `${SITE_URL}/en/guides`, 'he-IL': `${SITE_URL}/he/guides`,
        'en-US': `${SITE_URL}/en/guides`, 'es-US': `${SITE_URL}/es/guides`,
        'en-GB': `${SITE_URL}/en/guides`, 'en-SE': `${SITE_URL}/en/guides`,
        'sv-SE': `${SITE_URL}/sv/guides`, 'en-JP': `${SITE_URL}/en/guides`,
        'ja-JP': `${SITE_URL}/ja/guides`, 'en-ES': `${SITE_URL}/en/guides`,
        'es-ES': `${SITE_URL}/es/guides`, 'en-MX': `${SITE_URL}/en/guides`,
        'es-MX': `${SITE_URL}/es/guides`, 'en-AU': `${SITE_URL}/en/guides`,
        'es-AR': `${SITE_URL}/es/guides`, 'es-CO': `${SITE_URL}/es/guides`,
        'ru-RU': `${SITE_URL}/ru/guides`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function GuidesIndexPage({ params }: PageProps) {
  const { locale } = await params;
  const guidesData = guidesSeoContent[locale] ?? guidesSeoContent.en;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/${locale}/guides` },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/${locale}/guides#faq`,
    inLanguage: locale,
    mainEntity: guidesData.faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${SITE_URL}/${locale}/guides#list`,
    name: guidesData.title,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: 3,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Classic Mode Strategy Guide', url: `${SITE_URL}/${locale}/guides/classic-strategy` },
      { '@type': 'ListItem', position: 2, name: 'Blast Mode Mastery Guide', url: `${SITE_URL}/${locale}/guides/blast-strategy` },
      { '@type': 'ListItem', position: 3, name: 'Word Hunt Strategy Guide', url: `${SITE_URL}/${locale}/guides/word-hunt-strategy` },
    ],
  };

  // Safe: all content sourced from static module-level constants, not user input
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json">{encodeJsonLd(faqSchema)}</script>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <GuidesIndexPageClient />
    </>
  );
}
