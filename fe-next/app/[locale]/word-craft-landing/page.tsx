import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import {
  getWordCraftLandingContent,
  buildWordCraftLandingJsonLd,
  WORDCRAFT_LANDING_LOCALES,
  WORDCRAFT_LANDING_PATH,
  WORDCRAFT_GAME_PATH,
  type WordCraftLandingLocale,
} from './content';
import { TopBackLink } from '@/components/navigation/TopBackLink';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = WORDCRAFT_LANDING_LOCALES.includes(locale as WordCraftLandingLocale);
  const pageUrl = `${BASE_URL}/${locale}${WORDCRAFT_LANDING_PATH}`;
  const c = getWordCraftLandingContent(locale);
  const ogLocale = locale === 'he' ? 'he_IL' : locale === 'es' ? 'es_ES' : locale === 'sv' ? 'sv_SE' : locale === 'ja' ? 'ja_JP' : 'en_US';
  const ogImage = `${BASE_URL}/og-image-en.webp`;
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    keywords:
      'word strategy game, free word game online, scrabble alternative, word battle game, play word game vs friend, word duel game, territory word game, beatable word game bot, word game no download, multiplayer word game browser',
    openGraph: {
      title: c.ogTitle,
      description: c.ogDescription,
      locale: ogLocale,
      type: 'website',
      url: pageUrl,
      images: [{ url: ogImage, width: 1200, height: 630, alt: c.ogTitle }],
    },
    twitter: { card: 'summary_large_image', title: c.ogTitle, description: c.ogDescription, images: [ogImage] },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en${WORDCRAFT_LANDING_PATH}`,
        en: `${BASE_URL}/en${WORDCRAFT_LANDING_PATH}`,
        he: `${BASE_URL}/he${WORDCRAFT_LANDING_PATH}`,
        sv: `${BASE_URL}/sv${WORDCRAFT_LANDING_PATH}`,
        ja: `${BASE_URL}/ja${WORDCRAFT_LANDING_PATH}`,
        es: `${BASE_URL}/es${WORDCRAFT_LANDING_PATH}`,
      },
    },
    robots: isTargetLocale && locale === 'en' ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const c = getWordCraftLandingContent(locale);
  const playHref = `/${locale}${WORDCRAFT_GAME_PATH}`;
  const jsonLd = buildWordCraftLandingJsonLd(locale, BASE_URL);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <Script id="ld-wc-game" type="application/ld+json">{JSON.stringify(jsonLd.game)}</Script>
      <Script id="ld-wc-faq" type="application/ld+json">{JSON.stringify(jsonLd.faq)}</Script>
      <Script id="ld-wc-breadcrumb" type="application/ld+json">{JSON.stringify(jsonLd.breadcrumb)}</Script>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <TopBackLink className="mb-4" />

        {/* Hero */}
        <section className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-purple px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-white shadow-hard">
              {c.heroTag}
            </span>
            <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">
              {c.heroH1}{' '}
              <span className="inline-block rotate-[-2deg] bg-neo-lime px-3 text-neo-navy shadow-hard">{c.heroHighlight}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neo-gray-200 sm:text-xl">{c.heroSubtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={playHref}
                className="rounded-neo border-4 border-neo-black bg-neo-lime px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl"
              >
                {c.playCta}
              </Link>
              <a
                href="#how"
                className="rounded-neo border-4 border-neo-black bg-neo-cyan px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
              >
                {c.secondaryCta}
              </a>
            </div>
          </div>
          <div className="lg:col-span-5">
            {/* Playful mini board preview — pure CSS, no asset weight. */}
            <div aria-hidden className="rounded-neo border-4 border-neo-black bg-neo-navy-light p-5 shadow-hard-xl">
              <div className="grid grid-cols-4 gap-2">
                {['W', 'O', 'R', 'D', 'C', 'R', 'A', 'F', 'T', 'I', 'L', 'E', 'P', 'L', 'A', 'Y'].map((ltr, i) => {
                  const tone = [
                    'bg-neo-lime text-neo-navy',
                    'bg-neo-cyan text-neo-navy',
                    'bg-neo-pink text-neo-white',
                    'bg-neo-purple text-neo-white',
                  ][i % 4];
                  return (
                    <div
                      key={i}
                      className={`flex aspect-square items-center justify-center rounded-neo border-neo-thick border-neo-black font-neo-display text-xl font-black shadow-hard-sm ${tone}`}
                    >
                      {ltr}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* How it works — keep the "easy" promise front and center */}
        <section id="how" className="mt-16 scroll-mt-20">
          <h2 className="font-neo-display text-3xl font-black sm:text-4xl">{c.stepsTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {c.steps.map((s) => (
              <div key={s.n} className="rounded-neo border-neo-thick border-neo-black bg-neo-navy-light p-5 shadow-hard">
                <div className="flex h-9 w-9 items-center justify-center rounded-neo border-neo-thick border-neo-black bg-neo-lime font-neo-display text-lg font-black text-neo-navy shadow-hard-sm">
                  {s.n}
                </div>
                <h3 className="mt-3 font-neo-display text-lg font-bold text-neo-cyan">{s.title}</h3>
                <p className="mt-2 text-neo-gray-200">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why it's fun */}
        <section className="mt-16">
          <h2 className="font-neo-display text-3xl font-black sm:text-4xl">{c.featuresTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.features.map((f) => (
              <div key={f.title} className="rounded-neo border-neo bg-neo-navy-light p-5 shadow-hard-sm">
                <div className="text-3xl" aria-hidden>{f.emoji}</div>
                <h3 className="mt-2 font-neo-display text-lg font-bold text-neo-purple">{f.title}</h3>
                <p className="mt-2 text-neo-gray-200">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Friend duel spotlight */}
        <section className="mt-16">
          <div className="rounded-neo border-4 border-neo-black bg-neo-pink/15 p-6 shadow-hard-xl sm:p-8">
            <h2 className="font-neo-display text-3xl font-black text-neo-pink sm:text-4xl">{c.duelTitle}</h2>
            <p className="mt-4 max-w-3xl text-lg text-neo-gray-200">{c.duelBody}</p>
            <Link
              href={playHref}
              className="mt-6 inline-block rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl"
            >
              {c.duelCta}
            </Link>
          </div>
        </section>

        {/* FAQ (GEO-citable) */}
        <section className="mt-16">
          <h2 className="font-neo-display text-3xl font-black sm:text-4xl">{c.faqTitle}</h2>
          <div className="mt-6 space-y-4">
            {c.faqs.map((f) => (
              <details key={f.q} className="rounded-neo border-neo bg-neo-navy-light p-4">
                <summary className="cursor-pointer font-neo-display font-bold text-neo-white">{f.q}</summary>
                <p className="mt-2 text-neo-gray-200">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mt-16 text-center">
          <h2 className="font-neo-display text-2xl font-black sm:text-3xl">{c.closingTitle}</h2>
          <Link
            href={playHref}
            className="mt-6 inline-block rounded-neo border-4 border-neo-black bg-neo-lime px-8 py-4 font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl"
          >
            {c.closingCta}
          </Link>
        </section>
      </div>
    </main>
  );
}
