import type { Metadata } from 'next';
import HomePageClient from '../PageClient';
import { fetchLandingData } from '@/lib/landing/fetchLandingData';
import { HomepageContentSection } from '@/components/seo/HomepageContentSection';
import { FaqPageJsonLd } from '@/components/seo/FaqPageJsonLd';
import { EsScrabbleCrossLink } from '@/components/seo/EsScrabbleCrossLink';
import { SvScrabbleCrossLink } from '@/components/seo/SvScrabbleCrossLink';
import { EnBoggleCrossLink } from '@/components/seo/EnBoggleCrossLink';
import { SUPPORTED_LOCALES } from '@/lib/localeResolution';
import { seoContent } from './seoContent';

/**
 * Main landing page - Game mode selection
 *
 * ISR: revalidate every 5 minutes. All client-only inputs (?room=, ?next=,
 * FTUE state, auth) are consumed in PageClient via window/localStorage,
 * so this route is safely static-renderable.
 */
export const revalidate = 300;

/**
 * `[locale]` is a dynamic segment, so without these params Next cannot
 * prerender anything beneath it and the `revalidate` above is inert — which is
 * why `next build` reported 453 of 456 routes as ƒ (Dynamic) and production
 * answered `cache-control: private, no-store` on every page, SEO pages
 * included (verified live on /en, /en/faq, /en/tools, /en/blog/*).
 *
 * Necessary but NOT yet sufficient, measured 2026-08-25: with these params the
 * build prerenders 214 pages (it previously aborted here — see the
 * GlobalBottomNav fix), but the route table still prints ƒ for this route. The
 * remaining dynamic signal is almost certainly `fetchCache = 'force-no-store'`
 * on app/[locale]/layout.tsx, which is a deliberate workaround for the Next 16
 * memory leak (vercel/next.js#90433) and cannot simply be dropped. When that
 * lands upstream, removing it should flip these routes to ● with no further
 * work here.
 */
export function generateStaticParams(): Array<{ locale: string }> {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

const titleMap: Record<string, string> = {
  en: 'Play Boggle Online Free — Multiplayer Word Game | LexiClash',
  he: 'משחקי מילים אונליין · מרובה משתתפים בעברית חינם | LexiClash',
  sv: 'Spela Gratis Ordspel Online — Multiplayer | LexiClash',
  ja: '無料オンラインワードゲーム｜友達と対戦・日本語対応 LexiClash',
  es: 'Juegos de Palabras Multijugador en Español | LexiClash',
  ru: 'Игры в слова онлайн — играй бесплатно с другими | LexiClash',
};

const keywordsMap: Record<string, string> = {
  en: 'free multiplayer word game, boggle online free, boggle shake, daily word wheel, word wheel puzzles free online, free boggle online no download, word games online free, words with friends alternative, multiplayer word games online',
  he: 'משחק מילים מרובה משתתפים, גלגל מילים יומי, בוגל אונליין, משחקי מילים חינם',
  sv: 'gratis ordspel online, dagligt ordhjul, ordspel multiplayer, alfapet alternativ',
  ja: '無料ワードゲーム, デイリーワードホイール, 多人数ワードゲーム, ワードパズル',
  es: 'juegos de palabras gratis, rueda de palabras diaria, juego multijugador de palabras',
  ru: 'игры в слова, игра в слова онлайн, составь слова из букв, найди слова, словесные игры, балда онлайн, эрудит онлайн, анаграммы онлайн, игра в слова с друзьями, слово дня',
};

const descriptionMap: Record<string, string> = {
  en: 'Play Boggle online free with friends — no signup, no download. Real-time word battles, daily word wheel, 6 modes. Play in browser. Start now →',
  he: 'משחק מילים מרובה משתתפים חינם בעברית — ללא הורדה. בוגל בזמן אמת עם חברים, גלגל מילים יומי, 6 מצבי משחק, 10,000+ מילים. שחק עכשיו בדפדפן ←',
  sv: 'Spela gratis ordspel online med vänner — ingen nedladdning. Realtids ordstrider, dagligt ordhjul, 6 spellägen, 5 språk. Som Alfapet möter Boggle. Spela nu →',
  ja: '友達と無料マルチプレイヤーワードゲーム — 登録不要・ダウンロード不要。リアルタイム単語バトル、毎日のワードホイール、6モード、5言語対応。今すぐブラウザで開始 →',
  es: 'Juego de palabras multijugador gratis — sin descarga, sin registro. Batallas en tiempo real, rueda diaria, 6 modos, 5 idiomas. ¡Juega en tu navegador! →',
  ru: 'Бесплатная игра в слова с другими игроками — без регистрации и скачивания. Битвы в реальном времени, ежедневное колесо слов, 6 режимов. Играй в браузере →',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: { absolute: titleMap[locale] || titleMap.en },
    description: descriptionMap[locale] || descriptionMap.en,
    keywords: keywordsMap[locale] || keywordsMap.en,
  };
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  // Fetch non-realtime landing data server-side to eliminate client waterfall.
  // fetchLandingData is cached per-locale (see LANDING_CACHE_TTL_MS), so this is
  // a ~0ms memory read for all but the first request per TTL window. The race
  // below is a cold-miss safety net only: if the underlying DB fetch stalls we
  // ship HTML immediately and client hooks hydrate the data (they already
  // fall back gracefully when initialData is absent), rather than blocking TTFB.
  const SSR_LANDING_DATA_BUDGET_MS = 1500;
  const initialData = await Promise.race([
    fetchLandingData(locale),
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), SSR_LANDING_DATA_BUDGET_MS)),
  ]).catch(() => undefined);

  const content = seoContent[locale] ?? seoContent.en;
  return (
    <>
      {/* Preload hero mascot from first server HTML byte — fires before the client
          component subtree emits its own <Image priority> preload, giving the
          browser a head-start on the 402 KB animated WebP that is the LCP element.
          Mirrors the same pattern used on the multiplayer page (/mascot/play.webp). */}
      <link rel="preload" as="image" href="/mascot/winner.webp" type="image/webp" fetchPriority="high" />
      {/* Preload the LCP element (anchor mode-cube image) from the very first
          HTML bytes. next/image's own priority preload is emitted where the
          client subtree renders — ~78% through the 900KB streamed document —
          so discovery was delayed by ~3s (Lighthouse "LCP load delay 34%").
          imageSrcSet/imageSizes must match the anchor <Image> exactly so the
          browser reuses this preload instead of double-fetching. */}
      <link
        rel="preload"
        as="image"
        imageSrcSet="/_next/image?url=%2Fmodes%2Fcubes%2Farena.png&amp;w=640&amp;q=75 640w, /_next/image?url=%2Fmodes%2Fcubes%2Farena.png&amp;w=750&amp;q=75 750w, /_next/image?url=%2Fmodes%2Fcubes%2Farena.png&amp;w=828&amp;q=75 828w, /_next/image?url=%2Fmodes%2Fcubes%2Farena.png&amp;w=1080&amp;q=75 1080w, /_next/image?url=%2Fmodes%2Fcubes%2Farena.png&amp;w=1200&amp;q=75 1200w, /_next/image?url=%2Fmodes%2Fcubes%2Farena.png&amp;w=1920&amp;q=75 1920w"
        imageSizes="(max-width: 640px) min(100vw, 640px), (max-width: 768px) min(50vw, 384px), 50vw"
        fetchPriority="high"
      />
      {/* FAQPage must appear on exactly ONE url per locale (this homepage). Do not
          hoist it into the root layout: landing pages such as
          /es/juego-de-palabras-multijugador emit their own FAQPage, and two on one
          url makes Google report "Duplicate field 'FAQPage'".
          Fed from the same `content.faq` that HomepageContentSection renders as
          visible prose — Google requires the structured data to match copy that is
          actually on the page. */}
      <FaqPageJsonLd faqs={content.faq.map(({ question, answer }) => ({ q: question, a: answer }))} />
      <HomePageClient initialData={initialData} />
      <EsScrabbleCrossLink locale={locale} anchorVariant="home" />
      <SvScrabbleCrossLink locale={locale} anchorVariant="home" />
      <EnBoggleCrossLink locale={locale} anchorVariant="home" />
      {/* Visible publisher content (was sr-only GamePageSeoContent until 2026-06-04).
          A human AdSense reviewer landing here now sees a real About/FAQ section and
          links into the editorial surface. See docs/2026-06-04-adsense-approval-plan.md. */}
      <HomepageContentSection content={content} locale={locale} />
    </>
  );
}
