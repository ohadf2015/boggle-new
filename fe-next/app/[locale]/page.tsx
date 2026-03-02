import type { Metadata } from 'next';
import HomePageClient from './PageClient';

/**
 * Main landing page - Game mode selection
 * Users choose between Single Player and Multiplayer modes
 */

interface PageProps {
  params: Promise<{ locale: string }>;
}

const titleMap: Record<string, string> = {
  en: 'LexiClash - Free Multiplayer Word Game | Play Online With Friends',
  he: 'לקסיקלאש - משחק מילים מרובה משתתפים חינם | שחקו אונליין עם חברים',
  sv: 'LexiClash - Gratis Multiplayer Ordspel | Spela Online Med Vänner',
  ja: 'LexiClash - 無料マルチプレイヤーワードゲーム | フレンドとオンラインプレイ',
  es: 'LexiClash - Juego de Palabras Multijugador Gratis | Juega Online',
};

const descriptionMap: Record<string, string> = {
  en: 'Play the best free multiplayer word game online! Race friends to find words on a shared grid, build combos, and climb leaderboards. Like Boggle and Wordle but multiplayer. No download needed — play instantly in 5 languages.',
  he: 'שחקו במשחק המילים הטוב ביותר בחינם! התחרו עם חברים בזמן אמת, מצאו מילים, בנו קומבו וטפסו בטבלת המובילים. כמו בוגל ווורדל אבל מרובה משתתפים. ללא הורדה — שחקו מיידית ב-5 שפות.',
  sv: 'Spela det bästa gratis multiplayer-ordspelet online! Tävla mot vänner i realtid, hitta ord, bygg kombos och klättra på topplistorna. Som Boggle och Wordle men multiplayer. Ingen nedladdning krävs — spela direkt på 5 språk.',
  ja: '最高の無料マルチプレイヤーワードゲームをオンラインでプレイ！友達とリアルタイムで競い、単語を見つけ、コンボを構築し、リーダーボードを上りましょう。BoggleやWordleのようですがマルチプレイヤー。ダウンロード不要 — 5言語で即座にプレイ。',
  es: 'Juega al mejor juego de palabras multijugador gratis en linea. Compite con amigos en tiempo real, encuentra palabras, construye combos y sube en la clasificacion. Como Boggle y Wordle pero multijugador. Sin descarga — juega al instante en 5 idiomas.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: titleMap[locale] || titleMap.en,
    description: descriptionMap[locale] || descriptionMap.en,
  };
}

export default function HomePage() {
  return <HomePageClient />;
}
