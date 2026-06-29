import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import PlayStoreCTA from '@/components/PlayStoreCTA';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { PLAY_STORE_URL } from '@/utils/androidApp';
import { getDownloadLandingCopy } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const SLUG = 'download-word-game-android';
const SUPPORTED_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const HERO_IMAGE = '/images/landing/download-word-game-android-hero.webp';

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = getDownloadLandingCopy(locale);
  const isSupported = (SUPPORTED_LOCALES as readonly string[]).includes(locale);
  const pageUrl = `${BASE_URL}/${locale}/${SLUG}`;
  const ogImage = `${BASE_URL}/${OG_IMAGE[locale] ?? OG_IMAGE.en}`;

  const languageMap: Record<string, string> = { 'x-default': `${BASE_URL}/en/${SLUG}` };
  SUPPORTED_LOCALES.forEach((l) => {
    languageMap[l] = `${BASE_URL}/${l}/${SLUG}`;
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

const FEATURE_VISUALS = [
  'bg-neo-lime',
  'bg-neo-pink',
  'bg-neo-cyan',
  'bg-neo-purple',
  'bg-neo-lime',
] as const;

export default async function DownloadWordGameAndroidPage({ params }: PageProps) {
  const { locale } = await params;
  const copy = getDownloadLandingCopy(locale);

  // SoftwareApplication / MobileApplication — install-intent schema (no rating).
  const appJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': ['MobileApplication', 'SoftwareApplication'],
    name: copy.appName,
    description: copy.appDescription,
    operatingSystem: 'ANDROID',
    applicationCategory: 'GameApplication',
    url: `${BASE_URL}/${locale}/${SLUG}`,
    image: `${BASE_URL}/${OG_IMAGE[locale] ?? OG_IMAGE.en}`,
    inLanguage: ['en', 'he', 'sv', 'ja', 'es', 'ru'],
    installUrl: PLAY_STORE_URL,
    downloadUrl: PLAY_STORE_URL,
    isFamilyFriendly: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    publisher: { '@type': 'Organization', '@id': `${BASE_URL}/#organization`, name: 'LexiClash' },
  });

  const faqJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: copy.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  });

  const breadcrumbJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: copy.appName, item: `${BASE_URL}/${locale}/${SLUG}` },
    ],
  });

  const howToJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: copy.installHeading,
    description: copy.metaDescription,
    totalTime: 'PT1M',
    step: copy.installSteps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.sub,
    })),
  });

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <Script id="ld-app-android" type="application/ld+json">{appJsonLd}</Script>
      <Script id="ld-faq-android" type="application/ld+json">{faqJsonLd}</Script>
      <Script id="ld-breadcrumb-android" type="application/ld+json">{breadcrumbJsonLd}</Script>
      <Script id="ld-howto-android" type="application/ld+json">{howToJsonLd}</Script>

      {/* MARQUEE */}
      <div className="border-y-3 border-neo-black bg-neo-pink overflow-hidden">
        <div className="flex animate-[scrollDL_30s_linear_infinite] gap-6 whitespace-nowrap py-2 font-neo-display text-sm font-black uppercase tracking-widest text-neo-white sm:text-base">
          {[...copy.marqueeBadges, ...copy.marqueeBadges, ...copy.marqueeBadges].map((b, i) => (
            <span key={`dl-${i}`} className="inline-flex items-center gap-3"><span>★</span><span>{b}</span></span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        {/* HERO */}
        <span className="mb-4 inline-block rotate-[-2deg] rounded-neo border-3 border-neo-black bg-neo-lime px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">{copy.badge}</span>
        <h1 className="mb-6 font-neo-display text-4xl font-black leading-tight sm:text-5xl">
          {copy.h1Pre}<br /><span className="bg-neo-pink px-3 text-neo-white shadow-hard inline-block rotate-[-1deg]">{copy.h1Highlight}</span>
        </h1>

        <p className="mb-4 text-lg leading-relaxed text-neo-gray-200">{copy.introP1}</p>
        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">{copy.introP2}</p>

        <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <PlayStoreCTA campaign={SLUG} locale={locale} label={copy.installCtaLabel} ariaLabel={copy.installCtaAria} />
          <Link href={`/${locale}`} className="font-bold text-neo-cyan underline-offset-4 hover:underline">
            {copy.playWebLabel}
          </Link>
        </div>

        <div className="mb-12 overflow-hidden rounded-neo border-3 border-neo-black shadow-hard-lg">
          <Image
            src={HERO_IMAGE}
            alt={copy.heroImageAlt}
            width={1200}
            height={806}
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="h-auto w-full"
          />
        </div>

        {/* FEATURES */}
        <section className="mb-12">
          <h2 className="mb-2 font-neo-display text-2xl font-bold sm:text-3xl">{copy.featuresHeading}</h2>
          <p className="mb-6 text-sm text-neo-gray-200">{copy.featuresSub}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {copy.features.map((f, i) => (
              <div key={f.title} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-5 shadow-hard">
                <span className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-md border-3 border-neo-black ${FEATURE_VISUALS[i] ?? 'bg-neo-lime'} text-2xl shadow-hard-sm`}>{f.icon}</span>
                <h3 className="mb-1 font-neo-display text-lg font-bold text-neo-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-neo-gray-200">{f.blurb}</p>
              </div>
            ))}
          </div>
        </section>

        {/* COMPARISON */}
        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">{copy.comparisonHeading}</h2>
          <div className="overflow-x-auto rounded-neo border-3 border-neo-black bg-neo-navy/50 shadow-hard">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-3 border-neo-black bg-neo-pink text-neo-white">
                  {copy.comparisonHeaders.map((h) => (
                    <th key={h} className="p-3 text-start font-neo-display text-xs uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-neo-gray-200">
                {copy.comparisonRows.map((row) => (
                  <tr key={row[0]} className="border-b border-neo-gray-400/20 last:border-0">
                    {row.map((cell, i) => (
                      <td key={i} className={`p-3 ${i === 0 ? 'font-bold text-neo-white' : i === 2 ? 'text-neo-lime' : ''}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neo-gray-200/70">{copy.comparisonFooter}</p>
        </section>

        {/* INSTALL STEPS */}
        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">{copy.installHeading}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {copy.installSteps.map((s) => (
              <div key={s.step} className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard">
                <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md border-2 border-neo-black bg-neo-pink font-neo-display text-lg font-black text-neo-white">{s.step}</span>
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
              <details key={`dl-faq-${idx}`} className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-pink transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* RELATED */}
        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">{copy.relatedHeading}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {copy.related.map((r) => (
              <Link key={r.hrefSuffix} href={`/${locale}${r.hrefSuffix}`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-pink/60">
                <h3 className="font-bold text-neo-cyan">{r.title}</h3>
                <p className="mt-1 text-xs text-neo-gray-200">{r.sub}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mb-12 rounded-neo border-3 border-neo-black bg-neo-navy-light p-6 shadow-hard sm:p-8">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">{copy.finalCtaHeading}</h2>
          <p className="mt-4 text-neo-gray-200">{copy.finalCtaBody}</p>
          <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <PlayStoreCTA campaign={SLUG} locale={locale} label={copy.installCtaLabel} ariaLabel={copy.installCtaAria} />
            <Link href={`/${locale}`} className="font-bold text-neo-cyan underline-offset-4 hover:underline">
              {copy.playWebLabel}
            </Link>
          </div>
        </section>
      </div>
      <style>{`@keyframes scrollDL{from{transform:translateX(0)}to{transform:translateX(-33.333%)}}`}</style>
    </main>
  );
}
