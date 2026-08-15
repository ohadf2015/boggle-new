import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { getComparisonContent } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-kahoot-gimkit-vocabulary';

const OG_LOCALE: Record<string, string> = {
  en: 'en_US',
  he: 'he_IL',
  sv: 'sv_SE',
  ja: 'ja_JP',
  es: 'es_ES',
  ru: 'ru_RU',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;
  const c = getComparisonContent(locale);

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    keywords:
      'classroom vocabulary game, best classroom word game, kahoot alternative for classroom, gimkit alternative, gimkit free alternative, vocabulary.com alternative, free vocabulary game for schools, kahoot vs gimkit vocabulary, classroom game no student login, district word game, free word game for whole class',
    openGraph: {
      title: c.ogTitle,
      description: c.ogDescription,
      locale: OG_LOCALE[locale] ?? 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: c.ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: c.twitterTitle,
      description: c.twitterDescription,
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
      },
    },
    robots: { index: isEnglish, follow: true },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const c = getComparisonContent(locale);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/en${PAGE_PATH}#faq`,
    mainEntity: c.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Education', item: `${BASE_URL}/${locale}/education` },
      { '@type': 'ListItem', position: 3, name: 'Classroom Game Comparison', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  const moreHrefs = [
    `/${locale}/lexiclash-vs-kahoot`,
    `/${locale}/lexiclash-vs-quizlet`,
    `/${locale}/education/for-schools`,
  ];

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-vs-classroom-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-vs-classroom-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          {c.heroTitle}
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          {c.intro}
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            {c.ctaPlayClass}
          </Link>
          <Link href={`/${locale}/education/for-schools`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            {c.ctaForSchools}
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">{c.comparisonTitle}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-neo border-3 border-neo-gray-400 text-xs sm:text-sm">
              <thead>
                <tr className="border-b-3 border-neo-gray-400 bg-neo-navy/80">
                  <th className="px-3 py-3 text-left font-bold text-neo-lime">{c.comparisonTableFeatureHeader}</th>
                  <th className="px-3 py-3 text-center font-bold text-neo-cyan">LexiClash</th>
                  <th className="px-3 py-3 text-center text-neo-gray-300">Kahoot</th>
                  <th className="px-3 py-3 text-center text-neo-gray-300">Gimkit</th>
                  <th className="px-3 py-3 text-center text-neo-gray-300">Vocabulary.com</th>
                </tr>
              </thead>
              <tbody>
                {c.compareRows.map(([feature, lexi, kahoot, gimkit, vocab]) => (
                  <tr key={feature} className="border-b border-neo-gray-400/50">
                    <td className="px-3 py-3 font-medium">{feature}</td>
                    <td className="px-3 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-3 py-3 text-center text-neo-gray-300">{kahoot}</td>
                    <td className="px-3 py-3 text-center text-neo-gray-300">{gimkit}</td>
                    <td className="px-3 py-3 text-center text-neo-gray-300">{vocab}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neo-gray-300">
            {c.comparePricingFooter}
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">{c.whyTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {c.whyCards.map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">{c.whenTitle}</h2>
          <div className="space-y-4 text-neo-gray-200">
            <p><span className="font-bold text-neo-cyan">Kahoot</span> — {c.whenKahoots}</p>
            <p><span className="font-bold text-neo-cyan">Gimkit</span> — {c.whenGimkits}</p>
            <p><span className="font-bold text-neo-cyan">Vocabulary.com</span> — {c.whenVocabularys}</p>
            <p className="pt-2">{c.whenFinal}</p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">{c.faqTitle}</h2>
          <div className="space-y-4">
            {c.faqs.map((faq, idx) => (
              <details key={`faq-${idx}`} className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-lime transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">{c.moreTitle}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {c.moreCards.map((card, i) => (
              <Link key={card.title} href={moreHrefs[i]} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
                <h3 className="font-bold text-neo-cyan">{card.title}</h3>
                <p className="mt-1 text-xs text-neo-gray-200">{card.sub}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">{c.finalTitle}</h2>
          <p className="mt-4 text-neo-gray-200">{c.finalBody}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link href={`/${locale}/education/classroom-game`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
              {c.finalCtaPlay}
            </Link>
            <Link href={`/${locale}/education/for-schools`} className="inline-block rounded-neo border-4 border-neo-pink bg-transparent px-8 py-4 font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10">
              {c.finalCtaSchools}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
