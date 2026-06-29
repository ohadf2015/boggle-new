import type { Metadata } from 'next';
import ToolsHubPageClient from './PageClient';
import { getContent, type Locale } from './word-solver/content';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';

export const revalidate = 86400;

type ValidLocale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

interface PageParams {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (['en','he','sv','ja','es','ru'].includes(locale) ? locale : 'en') as ValidLocale;
  const content = getContent(validLocale);
  const localePath = `/${locale}`;
  const pageUrl = `${BASE_URL}${localePath}/tools`;

  const languages: Record<string, string> = { 'x-default': `${BASE_URL}/en/tools` };
  for (const loc of LOCALES) languages[loc] = `${BASE_URL}/${loc}/tools`;
  languages['en-IL'] = `${BASE_URL}/en/tools`;
  languages['he-IL'] = `${BASE_URL}/he/tools`;
  languages['en-US'] = `${BASE_URL}/en/tools`;
  languages['es-US'] = `${BASE_URL}/es/tools`;
  languages['en-GB'] = `${BASE_URL}/en/tools`;
  languages['en-SE'] = `${BASE_URL}/en/tools`;
  languages['sv-SE'] = `${BASE_URL}/sv/tools`;
  languages['en-JP'] = `${BASE_URL}/en/tools`;
  languages['ja-JP'] = `${BASE_URL}/ja/tools`;
  languages['en-ES'] = `${BASE_URL}/en/tools`;
  languages['es-ES'] = `${BASE_URL}/es/tools`;
  languages['en-MX'] = `${BASE_URL}/en/tools`;
  languages['es-MX'] = `${BASE_URL}/es/tools`;
  languages['en-AU'] = `${BASE_URL}/en/tools`;
  languages['es-AR'] = `${BASE_URL}/es/tools`;
  languages['es-CO'] = `${BASE_URL}/es/tools`;

  return {
    title: `${content.toolsHub.title} | LexiClash`,
    description: content.toolsHub.description,
    openGraph: {
      type: 'website',
      locale: validLocale,
      url: pageUrl,
      title: content.toolsHub.title,
      description: content.toolsHub.description,
      siteName: 'LexiClash',
    },
    alternates: {
      canonical: pageUrl,
      languages,
    },
  };
}

const toolsSeoContent: Record<string, {
  title: string;
  description: string;
  features: string[];
  faq: { question: string; answer: string }[];
}> = {
  en: {
    title: 'LexiClash Word Tools — Solver, Unscrambler & More',
    description:
      'Free word tools to boost your game. Use our Word Solver to find words from any letters, unscramble jumbled words, and discover new vocabulary. Perfect for Scrabble, Boggle, and LexiClash practice.',
    features: [
      'Word Solver — enter any letters and get all valid words instantly',
      'Anagram finder — unscramble jumbled letters into real words',
      'Filter results by word length for targeted practice',
      'Multi-language support — works with English, Hebrew, Swedish, Japanese, and Spanish dictionaries',
      'Free to use — no sign-up or payment required',
    ],
    faq: [
      { question: 'How does the Word Solver work?', answer: 'Enter your available letters and the solver checks all possible combinations against our dictionary. Results are grouped by length and sorted by score.' },
      { question: 'Can I use the tools for Scrabble or other word games?', answer: 'Yes — the Word Solver uses a standard dictionary that covers Scrabble, Boggle, Words With Friends, and LexiClash valid words.' },
      { question: 'Are the tools free?', answer: 'All word tools on LexiClash are completely free to use with no account required.' },
    ],
  },
  he: {
    title: 'כלי מילים של LexiClash — פותר, מפענח ועוד',
    description: 'כלי מילים חינמיים לשיפור המשחק. השתמשו בפותר המילים כדי למצוא מילים מכל אותיות.',
    features: ['פותר מילים — הזינו אותיות וקבלו מילים תקינות', 'מפענח אנגרמות', 'סינון לפי אורך מילה'],
    faq: [{ question: 'איך פותר המילים עובד?', answer: 'הזינו אותיות והפותר בודק את כל השילובים האפשריים מול המילון שלנו.' }],
  },
  sv: {
    title: 'LexiClash Ordverktyg — Lösare, Avkodare & Mer',
    description: 'Gratis ordverktyg för att förbättra ditt spel. Använd vår Ordlösare för att hitta ord från alla bokstäver.',
    features: ['Ordlösare — ange bokstäver och få giltiga ord', 'Anagramfinnare', 'Filtrera efter ordlängd'],
    faq: [{ question: 'Hur fungerar Ordlösaren?', answer: 'Ange dina bokstäver och lösaren kontrollerar alla möjliga kombinationer mot vår ordbok.' }],
  },
  ja: {
    title: 'LexiClash ワードツール — ソルバー、アンスクランブラーなど',
    description: '無料のワードツールでゲームを向上。ワードソルバーで任意の文字から単語を見つけましょう。',
    features: ['ワードソルバー — 文字を入力して有効な単語を即座に取得', 'アナグラムファインダー', '単語の長さでフィルタリング'],
    faq: [{ question: 'ワードソルバーはどう動きますか？', answer: '利用可能な文字を入力すると、辞書と照合してすべての可能な組み合わせをチェックします。' }],
  },
  es: {
    title: 'Herramientas de Palabras LexiClash — Solucionador, Descifrador y Más',
    description: 'Herramientas de palabras gratuitas para mejorar tu juego. Usa nuestro Solucionador de Palabras para encontrar palabras de cualquier letra.',
    features: ['Solucionador de palabras — ingresa letras y obtén palabras válidas', 'Buscador de anagramas', 'Filtrar por longitud de palabra', 'Soporte multiidioma'],
    faq: [
      { question: '¿Cómo funciona el Solucionador de Palabras?', answer: 'Ingresa tus letras disponibles y el solucionador verifica todas las combinaciones posibles contra nuestro diccionario.' },
      { question: '¿Son gratuitas las herramientas?', answer: 'Todas las herramientas de palabras en LexiClash son completamente gratuitas sin necesidad de cuenta.' },
    ],
  },
};

export default async function ToolsHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validLocale = (['en','he','sv','ja','es','ru'].includes(locale) ? locale : 'en') as ValidLocale;
  const seoData = toolsSeoContent[validLocale] ?? toolsSeoContent.en;
  return (
    <>
      <ToolsHubPageClient />
      <GamePageSeoContent
        title={seoData.title}
        description={seoData.description}
        features={seoData.features}
        faq={seoData.faq}
      />
    </>
  );
}
