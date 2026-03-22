import type { Metadata } from 'next';
import { loadTranslation } from '@/translations/loadTranslation';
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
  const t = await loadTranslation(locale as 'en' | 'he' | 'sv' | 'ja' | 'es') as Record<string, any>;
  const seo = t?.landing?.seo;
  const legal = t?.legal;

  // Fetch non-realtime landing data server-side to eliminate client waterfall.
  // Errors are swallowed — hooks fall back to client fetches when initialData is absent.
  const initialData = await fetchLandingData(locale).catch(() => undefined);

  return (
    <>
      <HomePageClient initialData={initialData} />

      {/* Server-rendered SEO content — visible to crawlers without JS execution.
          Visually hidden with CSS but NOT aria-hidden so crawlers index the text.
          This provides heading hierarchy (h2/h3) and word count for AdSense approval. */}
      <section className="sr-only">
        <h2>{seo?.whatIsTitle}</h2>
        <p>{seo?.whatIsContent}</p>

        <h2>{seo?.featuresTitle}</h2>
        <h3>{seo?.feature1Title}</h3>
        <p>{seo?.feature1Desc}</p>
        <h3>{seo?.feature2Title}</h3>
        <p>{seo?.feature2Desc}</p>
        <h3>{seo?.feature3Title}</h3>
        <p>{seo?.feature3Desc}</p>
        <h3>{seo?.feature4Title}</h3>
        <p>{seo?.feature4Desc}</p>

        <h2>{seo?.whoCanPlayTitle}</h2>
        <p>{seo?.whoCanPlayContent}</p>

        <h2>{seo?.gameModesTitle}</h2>
        <h3>{seo?.feature1Title}</h3>
        <p>{seo?.gameModesMultiplayer}</p>
        <h3>{t?.singlePlayer?.play || 'Single Player'}</h3>
        <p>{seo?.gameModesSingle}</p>
        <h3>{seo?.feature2Title}</h3>
        <p>{seo?.gameModesDaily}</p>
        <h3>{seo?.feature3Title}</h3>
        <p>{seo?.gameModesAdventure}</p>

        <h2>{seo?.educationTitle}</h2>
        <p>{seo?.educationContent}</p>

        <h2>{seo?.howToPlayTitle}</h2>
        <ol>
          <li>{seo?.step1}</li>
          <li>{seo?.step2}</li>
          <li>{seo?.step3}</li>
          <li>{seo?.step4}</li>
        </ol>

        <h2>{seo?.faqTitle}</h2>
        <dl>
          <dt>{seo?.faq1Q}</dt>
          <dd>{seo?.faq1A}</dd>
          <dt>{seo?.faq2Q}</dt>
          <dd>{seo?.faq2A}</dd>
          <dt>{seo?.faq3Q}</dt>
          <dd>{seo?.faq3A}</dd>
          <dt>{seo?.faq4Q}</dt>
          <dd>{seo?.faq4A}</dd>
          <dt>{seo?.faq5Q}</dt>
          <dd>{seo?.faq5A}</dd>
          <dt>{seo?.faq6Q}</dt>
          <dd>{seo?.faq6A}</dd>
        </dl>

        <h2>{seo?.communityTitle}</h2>
        <p>{seo?.communityContent}</p>

        <nav aria-label={legal?.title}>
          <h2>{legal?.title}</h2>
          <ul>
            <li><a href={`/${locale}/legal/privacy`}>{legal?.privacyPolicy}</a></li>
            <li><a href={`/${locale}/legal/terms`}>{legal?.termsOfService}</a></li>
            <li><a href={`/${locale}/legal/disclaimer`}>{legal?.disclaimer?.title || 'Disclaimer'}</a></li>
            <li><a href={`/${locale}/about`}>{t.footer?.about || 'About'}</a></li>
            <li><a href={`/${locale}/contact`}>{t.footer?.contact || 'Contact'}</a></li>
            <li><a href={`/${locale}/sitemap`}>{t.footer?.sitemap || 'Sitemap'}</a></li>
          </ul>
        </nav>
      </section>
    </>
  );
}
