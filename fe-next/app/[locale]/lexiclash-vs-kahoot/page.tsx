import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { KahootGoLimitHonestyStrip } from '@/components/education/KahootGoLimitHonestyStrip';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { copies, resolveVsLocale } from './copy';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-kahoot';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Kahoot — Free Kahoot Alternative for Vocabulary (2026) | LexiClash',
    description: 'LexiClash vs Kahoot compared: free word-formation games vs quiz-show format. No student signup, no Kahoot+ subscription, 6 languages, full multiplayer. The free Kahoot alternative for vocabulary and language teachers.',
    keywords: 'lexiclash vs kahoot, kahoot alternative, free kahoot alternative, kahoot vs lexiclash, alternatives to kahoot, free quiz game alternative, kahoot for free, classroom multiplayer free, vocabulary kahoot alternative, kahoot for teachers free',
    openGraph: {
      title: 'LexiClash vs Kahoot — The Free Alternative',
      description: 'Word games beat quiz format for vocabulary. No student signup. No Kahoot+ paywall. 6 languages.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Kahoot comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Kahoot — Free Alternative',
      description: 'Vocabulary word games. Free class play (3 classes × 50). Teacher Pro is $9/mo for teacher tools.',
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

/** Link targets for `copy.moreComparisons`, in the same order. */
const MORE_COMPARISON_SLUGS = ['lexiclash-vs-quizlet', 'lexiclash-vs-wordle', 'best-online-word-games'] as const;

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const c = copies[resolveVsLocale(locale)];

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
      { '@type': 'ListItem', position: 1, name: c.breadcrumbHome, item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: c.breadcrumbComparisons, item: `${BASE_URL}/${locale}/best-online-word-games` },
      { '@type': 'ListItem', position: 3, name: c.breadcrumbPage, item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <script id="ld-vs-kahoot-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script id="ld-vs-kahoot-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">{c.h1}</h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">{c.intro}</p>

      <TeacherProCompareCheckoutStrip locale={locale} />

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-[box-shadow] hover:shadow-hard-lg sm:px-8 sm:py-4">
            {c.ctaTry}
          </Link>
          <Link href={`/${locale}/education/games-for-teachers`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-[background-color] hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            {c.ctaTeachers}
          </Link>
          <Link href={`/${locale}/education/esl-word-games`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-[background-color] hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            {c.ctaEsl}
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">{c.tableHeading}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-neo border-3 border-neo-gray-400 text-sm sm:text-base">
              <thead>
                <tr className="border-b-3 border-neo-gray-400 bg-neo-navy/80">
                  <th className="px-4 py-3 text-start font-bold text-neo-lime">{c.thFeature}</th>
                  <th className="px-4 py-3 text-center font-bold text-neo-cyan">LexiClash</th>
                  <th className="px-4 py-3 text-center text-neo-gray-300">Kahoot</th>
                </tr>
              </thead>
              <tbody>
                {c.rows.map(([feature, lexi, kahoot]) => (
                  <tr key={feature} className="border-b border-neo-gray-400/50">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{kahoot}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neo-gray-300">{c.pricingNote}</p>
        </section>

        <KahootGoLimitHonestyStrip locale={locale} />

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">{c.beatsTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {c.beats.map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">{c.kahootWinsTitle}</h2>
          <p className="text-neo-gray-200">{c.kahootWins}</p>
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
            {MORE_COMPARISON_SLUGS.map((slug, i) => (
              <Link key={slug} href={`/${locale}/${slug}`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-[border-color] hover:border-neo-lime/40">
                <h3 className="font-bold text-neo-cyan">{c.moreComparisons[i].title}</h3>
                <p className="mt-1 text-xs text-neo-gray-200">{c.moreComparisons[i].desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">{c.tryTitle}</h2>
          <p className="mt-4 text-neo-gray-200">{c.tryBody}</p>
          <div className="mt-6">
            <Link href={`/${locale}/education/classroom-game`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-[box-shadow] hover:shadow-hard-lg">
              {c.tryCta}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
