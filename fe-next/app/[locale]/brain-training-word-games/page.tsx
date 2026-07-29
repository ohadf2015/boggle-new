import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { getBrainLandingCopy } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const SUPPORTED_LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;

const OG_IMAGE: Record<string, string> = {
  en: 'og-image-en.webp',
  he: 'og-image-he.webp',
  sv: 'og-image-en.webp',
  ja: 'og-image-ja.webp',
  es: 'og-image-en.webp',
};

const OG_LOCALE: Record<string, string> = {
  en: 'en_US',
  he: 'he_IL',
  sv: 'sv_SE',
  ja: 'ja_JP',
  es: 'es_ES',
};

const DRILL_IDS = ['lightning-round', 'memory-hunt', 'combo-master', 'pattern-switcher', 'rare-gems'] as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = getBrainLandingCopy(locale);
  const isSupported = (SUPPORTED_LOCALES as readonly string[]).includes(locale);
  const pageUrl = `${BASE_URL}/${locale}/brain-training-word-games`;
  const ogImage = `${BASE_URL}/${OG_IMAGE[locale] ?? OG_IMAGE.en}`;

  const languageMap: Record<string, string> = { 'x-default': `${BASE_URL}/en/brain-training-word-games` };
  SUPPORTED_LOCALES.forEach((l) => {
    languageMap[l] = `${BASE_URL}/${l}/brain-training-word-games`;
  });

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    keywords: copy.metaKeywords,
    openGraph: {
      title: copy.ogTitle,
      description: copy.ogDescription,
      locale: OG_LOCALE[locale] ?? 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: ogImage, width: 1200, height: 630, alt: copy.ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.twitterTitle,
      description: copy.twitterDescription,
      images: [ogImage],
    },
    alternates: {
      canonical: pageUrl,
      languages: languageMap,
    },
    robots: { index: isSupported, follow: true },
  };
}

const DRILL_VISUALS = [
  { icon: '⚡', accentBg: 'bg-neo-lime', accentText: 'text-neo-lime' },
  { icon: '🧠', accentBg: 'bg-neo-purple', accentText: 'text-neo-purple' },
  { icon: '🎯', accentBg: 'bg-neo-orange', accentText: 'text-neo-orange' },
  { icon: '🔄', accentBg: 'bg-neo-cyan', accentText: 'text-neo-cyan' },
  { icon: '💎', accentBg: 'bg-neo-lime', accentText: 'text-neo-lime' },
];

export default async function BrainTrainingWordGamesPage({ params }: PageProps) {
  const { locale } = await params;
  const copy = getBrainLandingCopy(locale);

  const faqJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: copy.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  });

  const videoGameJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: copy.videoGameName,
    url: `${BASE_URL}/${locale}/brain`,
    description: copy.videoGameDescription,
    image: `${BASE_URL}/${OG_IMAGE[locale] ?? OG_IMAGE.en}`,
    genre: ['Brain Training', 'Educational', 'Word Game', 'Cognitive Training', 'Puzzle'],
    gamePlatform: ['Web Browser', 'iOS', 'Android', 'PWA'],
    playMode: ['SinglePlayer'],
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (Web Browser)',
    inLanguage: ['en', 'he', 'sv', 'ja', 'es'],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: `${BASE_URL}/${locale}/brain` },
    publisher: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
  });

  const itemListJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: copy.itemListName,
    description: copy.itemListDescription,
    numberOfItems: 5,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: copy.drills.map((drill, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: drill.name,
      url: `${BASE_URL}/${locale}/brain/drills/${DRILL_IDS[i]}`,
      description: copy.itemListDescriptions[i],
    })),
  });

  const howToJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: copy.howToName,
    description: copy.howToDescription,
    totalTime: 'PT5M',
    step: copy.howToSteps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  });

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <Script id="ld-faq-brain" type="application/ld+json">{faqJsonLd}</Script>
      <Script id="ld-videogame-brain" type="application/ld+json">{videoGameJsonLd}</Script>
      <Script id="ld-itemlist-brain" type="application/ld+json">{itemListJsonLd}</Script>
      <Script id="ld-howto-brain" type="application/ld+json">{howToJsonLd}</Script>

      <div className="border-y-3 border-neo-black bg-neo-purple overflow-hidden">
        <div className="flex animate-[scrollBT_30s_linear_infinite] gap-6 whitespace-nowrap py-2 font-neo-display text-sm font-black uppercase tracking-widest text-neo-white sm:text-base">
          {[...copy.marqueeBadges, ...copy.marqueeBadges, ...copy.marqueeBadges].map((b, i) => (
            <span key={`bt-${i}`} className="inline-flex items-center gap-3"><span>★</span><span>{b}</span></span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />
        <span className="mb-4 inline-block rotate-[-2deg] rounded-neo border-3 border-neo-black bg-neo-lime px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">{copy.badge}</span>
        <h1 className="mb-6 font-neo-display text-4xl font-black leading-tight sm:text-5xl">
          {copy.h1Pre}<br /><span className="bg-neo-purple px-3 text-neo-white shadow-hard inline-block rotate-[-1deg]">{copy.h1Highlight}</span>
        </h1>

        <p className="mb-4 text-lg leading-relaxed text-neo-gray-200">{copy.introP1}</p>
        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">{copy.introP2}</p>

        <div className="mb-12 flex flex-col gap-3 sm:flex-row">
          <Link href={`/${locale}/brain`} className="inline-block rounded-neo border-4 border-neo-purple bg-neo-purple px-8 py-4 text-center font-bold text-neo-white shadow-hard transition-all hover:shadow-hard-lg">
            {copy.ctaPrimary}
          </Link>
          <Link href={`/${locale}/brain/drills/lightning-round`} className="inline-block rounded-neo border-4 border-neo-cyan bg-transparent px-8 py-4 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10">
            {copy.ctaSecondary}
          </Link>
        </div>

        {/* DRILLS */}
        <section className="mb-12">
          <h2 className="mb-2 font-neo-display text-2xl font-bold sm:text-3xl">{copy.drillsHeading}</h2>
          <p className="mb-6 text-sm text-neo-gray-200">{copy.drillsSub}</p>
          <div className="space-y-5">
            {copy.drills.map((drill, i) => {
              const v = DRILL_VISUALS[i];
              return (
                <div
                  key={drill.name}
                  className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-5 shadow-hard"
                  style={{ transform: i % 2 === 0 ? 'rotate(-0.2deg)' : 'rotate(0.2deg)' }}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-md border-3 border-neo-black ${v.accentBg} text-2xl shadow-hard-sm`}>{v.icon}</span>
                    <div>
                      <h3 className="font-neo-display text-xl font-bold text-neo-white">{drill.name}</h3>
                      <p className={`text-xs font-black uppercase tracking-widest ${v.accentText}`}>{drill.domain}</p>
                    </div>
                  </div>
                  <p className="mb-3 text-sm italic text-neo-gray-200">{drill.tagline}</p>
                  <p className="mb-4 text-sm leading-relaxed text-neo-gray-200">{drill.blurb}</p>
                  <div className="rounded-neo border-2 border-neo-gray-400/40 bg-neo-navy-light/40 p-3">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-neo-cyan">{copy.researchLabel}</p>
                    <p className="text-xs leading-relaxed text-neo-gray-200">{drill.research}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* COMPARISON */}
        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">{copy.comparisonHeading}</h2>
          <div className="overflow-x-auto rounded-neo border-3 border-neo-black bg-neo-navy/50 shadow-hard">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-3 border-neo-black bg-neo-purple text-neo-white">
                  {copy.comparisonHeaders.map((h) => (
                    <th key={h} className="p-3 text-start font-neo-display text-xs uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-neo-gray-200">
                {copy.comparisonRows.map((row) => (
                  <tr key={row[0]} className="border-b border-neo-gray-400/20 last:border-0">
                    {row.map((cell, i) => (
                      <td key={i} className={`p-3 ${i === 0 ? 'font-bold text-neo-white' : i === 1 ? 'text-neo-lime' : ''}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neo-gray-200/70">{copy.comparisonFooter}</p>
        </section>

        {/* HOW IT WORKS */}
        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">{copy.howHeading}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {copy.steps.map((s) => (
              <div key={s.step} className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard">
                <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md border-2 border-neo-black bg-neo-purple font-neo-display text-lg font-black text-neo-white">{s.step}</span>
                <h3 className="mb-1 font-neo-display text-base font-bold">{s.title}</h3>
                <p className="text-xs leading-relaxed text-neo-gray-200">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">{copy.faqHeading}</h2>
          <div className="space-y-4">
            {copy.faqs.map((faq, idx) => (
              <details key={`bt-faq-${idx}`} className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-purple transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* INTERNAL LINKS */}
        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">{copy.relatedHeading}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link href={`/${locale}/brain`} className="rounded-neo border-3 border-neo-purple/60 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-purple">
              <h3 className="font-bold text-neo-purple">{copy.relatedHubTitle}</h3>
              <p className="mt-1 text-xs text-neo-gray-200">{copy.relatedHubSub}</p>
            </Link>
            <Link href={`/${locale}/blog/word-games-for-brain-training`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-purple/40">
              <h3 className="font-bold text-neo-cyan">{copy.relatedScienceTitle}</h3>
              <p className="mt-1 text-xs text-neo-gray-200">{copy.relatedScienceSub}</p>
            </Link>
            <Link href={`/${locale}/best-online-word-games`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-purple/40">
              <h3 className="font-bold text-neo-cyan">{copy.relatedBestTitle}</h3>
              <p className="mt-1 text-xs text-neo-gray-200">{copy.relatedBestSub}</p>
            </Link>
            <Link href={`/${locale}/daily`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-purple/40">
              <h3 className="font-bold text-neo-cyan">{copy.relatedDailyTitle}</h3>
              <p className="mt-1 text-xs text-neo-gray-200">{copy.relatedDailySub}</p>
            </Link>
            <Link href={`/${locale}/word-of-the-day`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-purple/40">
              <h3 className="font-bold text-neo-cyan">{copy.relatedWotdTitle}</h3>
              <p className="mt-1 text-xs text-neo-gray-200">{copy.relatedWotdSub}</p>
            </Link>
            <Link href={`/${locale}/multiplayer`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-pink/40">
              <h3 className="font-bold text-neo-pink">{copy.relatedMpTitle}</h3>
              <p className="mt-1 text-xs text-neo-gray-200">{copy.relatedMpSub}</p>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">{copy.finalCtaHeading}</h2>
          <p className="mt-4 text-neo-gray-200">{copy.finalCtaBody}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link href={`/${locale}/brain`} className="inline-block rounded-neo border-4 border-neo-purple bg-neo-purple px-8 py-4 text-center font-bold text-neo-white shadow-hard transition-all hover:shadow-hard-lg">
              {copy.finalCtaPrimary}
            </Link>
            <Link href={`/${locale}/brain/drills/lightning-round`} className="inline-block rounded-neo border-4 border-neo-lime bg-transparent px-8 py-4 text-center font-bold text-neo-lime shadow-hard transition-all hover:bg-neo-lime/10">
              {copy.finalCtaSecondary}
            </Link>
          </div>
        </section>
      </div>
      <style>{`@keyframes scrollBT{from{transform:translateX(0)}to{transform:translateX(-33.333%)}}`}</style>
    </main>
  );
}
