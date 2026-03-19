import type { Metadata } from 'next';
import { translations } from '@/translations';
import HomePageClient from './PageClient';
import { fetchLandingData } from '@/lib/landing/fetchLandingData';

/**
 * Main landing page - Game mode selection
 * Users choose between Single Player and Multiplayer modes
 */

// ISR: Revalidate landing page every 60 seconds to avoid SSR on every request.
// The Supabase queries in fetchLandingData run at most once per minute per locale.
export const revalidate = 60;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const titleMap: Record<string, string> = {
  en: 'LexiClash - Free Multiplayer Word Game',
  he: 'לקסיקלאש - משחק מילים מרובה משתתפים חינם',
  sv: 'LexiClash - Gratis Multiplayer Ordspel',
  ja: 'LexiClash - 無料マルチプレイヤーワードゲーム',
  es: 'LexiClash - Juego de Palabras Multijugador',
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
    title: { absolute: titleMap[locale] || titleMap.en },
    description: descriptionMap[locale] || descriptionMap.en,
  };
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  const t = translations[locale as keyof typeof translations] || translations.en;
  const seo = t.landing?.seo;
  const legal = t.legal;

  // Fetch non-realtime landing data server-side to eliminate client waterfall.
  // Errors are swallowed — hooks fall back to client fetches when initialData is absent.
  const initialData = await fetchLandingData(locale).catch(() => undefined);

  return (
    <>
      <HomePageClient initialData={initialData} />

      {/* Server-rendered SEO content — visible to crawlers without JS execution.
          Hidden visually since the client-side LandingSEOSection covers the same content
          with richer interactivity. This is a fallback for non-JS bots (e.g. AdSense). */}
      <section className="sr-only" aria-hidden="true">
        <h2>{seo?.whatIsTitle}</h2>
        <p>{seo?.whatIsContent}</p>
        <h2>{seo?.featuresTitle}</h2>
        <ul>
          <li>{seo?.feature1Title} — {seo?.feature1Desc}</li>
          <li>{seo?.feature2Title} — {seo?.feature2Desc}</li>
          <li>{seo?.feature3Title} — {seo?.feature3Desc}</li>
          <li>{seo?.feature4Title} — {seo?.feature4Desc}</li>
        </ul>
        <h2>{legal?.title}</h2>
        <nav>
          <ul>
            <li><a href={`/${locale}/legal/privacy`}>{legal?.privacyPolicy}</a></li>
            <li><a href={`/${locale}/legal/terms`}>{legal?.termsOfService}</a></li>
            <li><a href={`/${locale}/legal/disclaimer`}>{legal?.disclaimer?.title || 'Disclaimer'}</a></li>
            <li><a href={`/${locale}/about`}>{t.footer?.about || 'About'}</a></li>
            <li><a href={`/${locale}/contact`}>{t.footer?.contact || 'Contact'}</a></li>
          </ul>
        </nav>
      </section>
    </>
  );
}
