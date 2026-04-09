import type { Metadata } from 'next';
import { loadTranslation } from '@/translations/loadTranslation';
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
  const t = await loadTranslation(locale as 'en' | 'he' | 'sv' | 'ja' | 'es') as Record<string, any>;
  const seo = t?.landing?.seo;
  const legal = t?.legal;

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

      {/* Server-rendered SEO content — visible to crawlers without JS execution.
          Visually hidden with CSS but NOT aria-hidden so crawlers index the text.
          This provides heading hierarchy (h2/h3) and word count for AdSense approval. */}
      <section className="sr-only">
        <p>{titleMap[locale] || titleMap.en}</p>
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

        <h2>Popular Word Games</h2>
        <nav aria-label="Popular word games">
          <ul>
            <li><a href={`/${locale === 'en' ? 'en' : locale}/play-boggle-online-free`}>Play Boggle Online Free — No Download</a></li>
            <li><a href={`/${locale === 'en' ? 'en' : locale}/word-games-online-free`}>Word Games Online Free</a></li>
            <li><a href={`/${locale === 'en' ? 'en' : locale}/daily-word-wheel`}>Daily Word Wheel Puzzle</a></li>
            <li><a href={`/${locale === 'en' ? 'en' : locale}/online-word-games-with-friends`}>Online Word Games With Friends</a></li>
            <li><a href={`/${locale === 'en' ? 'en' : locale}/multiplayer-word-game-online`}>Multiplayer Word Game Online</a></li>
          </ul>
        </nav>

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
