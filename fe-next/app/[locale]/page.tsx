import type { Metadata } from 'next';
import HomePageClient from './PageClient';
import { fetchLandingData } from '@/lib/landing/fetchLandingData';

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

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  // Fetch non-realtime landing data server-side to eliminate client waterfall.
  // Capped at 2s — client hooks provide fallback when initialData is absent.
  // Reduced from 4s: if Supabase is slow, faster to let client fetch than block SSR.
  const initialData = await Promise.race([
    fetchLandingData(locale),
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 2000)),
  ]).catch(() => undefined);

  return (
    <>
      <HomePageClient initialData={initialData} />
    </>
  );
}
