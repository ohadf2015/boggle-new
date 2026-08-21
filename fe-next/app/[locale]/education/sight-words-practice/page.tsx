import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { getSightWordsContent } from './content';
import { EducationHeroBanner } from '@/components/education/EducationHeroBanner';
import { DistrictUpsellStrip } from '@/components/education/DistrictUpsellStrip';
import { ScrollRevealSection } from '@/components/education/ScrollRevealSection';
import { TopBackLink } from '@/components/navigation/TopBackLink';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/education/sight-words-practice';

const OG_IMAGE: Record<string, string> = {
  en: 'education-hero-en.webp',
  he: 'education-hero-he.webp',
  sv: 'education-hero-sv.webp',
  ja: 'education-hero-ja.webp',
  es: 'education-hero-es.webp',
  ru: 'education-hero-en.webp',
};

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
  const pageUrl = `${BASE_URL}/${locale}${PAGE_PATH}`;
  const c = getSightWordsContent(locale);
  // EN-only landing: the body is English everywhere (see content.ts), so only
  // the EN version is indexed. Non-EN locales carry hreflang back to their
  // /education fallback — the same fallback cluster the sitemap's
  // educationLandings entries use — instead of pretending a translated twin
  // of this page exists.
  const isEnglish = locale === 'en';
  const ogImage = `${BASE_URL}/images/${OG_IMAGE[locale] ?? OG_IMAGE.en}`;
  const ogLocale = OG_LOCALE[locale] ?? 'en_US';
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    keywords: 'sight words practice, dolch sight words, fry sight words, sight word games, sight word activities, high frequency words practice, dolch word list games, fry first 100 words, sight word flashcards online, kindergarten sight words games',
    openGraph: {
      title: c.metaTitle,
      description: c.metaDescription,
      locale: ogLocale,
      type: 'website',
      url: pageUrl,
      images: [{ url: ogImage, width: 1200, height: 675, alt: c.metaTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: c.metaTitle,
      description: c.metaDescription,
      images: [ogImage],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en${PAGE_PATH}`,
        en: `${BASE_URL}/en${PAGE_PATH}`,
        he: `${BASE_URL}/he/education`,
        sv: `${BASE_URL}/sv/education`,
        ja: `${BASE_URL}/ja/education`,
        es: `${BASE_URL}/es/education`,
        ru: `${BASE_URL}/ru/education`,
      },
    },
    robots: isEnglish ? { index: true, follow: true } : { index: false, follow: true },
  };
}


export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const c = getSightWordsContent(locale);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/en${PAGE_PATH}#faq`,
    mainEntity: c.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': `${BASE_URL}/en/education#org`,
    name: 'LexiClash Education',
    url: `${BASE_URL}/en/education`,
    description:
      'Multiplayer vocabulary games for schools — 5 languages including Hebrew RTL, no student logins, 1v1 duels and whole-class play. Free 30-day trial for teachers; school plans from $149/year.',
    audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
    areaServed: ['US', 'IL', 'SE', 'JP', 'ES'],
    offers: [
      { '@type': 'Offer', name: 'Teacher Trial', price: 0, priceCurrency: 'USD', category: 'free trial', description: 'Full 30-day free trial for individual teachers', availability: 'https://schema.org/InStock' },
      { '@type': 'Offer', name: 'School Plan', price: 149, priceCurrency: 'USD', priceSpecification: { '@type': 'UnitPriceSpecification', price: 149, priceCurrency: 'USD', unitText: 'year' }, category: 'paid', description: 'School plan: admin dashboard, analytics, curriculum libraries, ad-free environment, SSO', availability: 'https://schema.org/InStock' },
    ],
  };

  const learningResourceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${BASE_URL}/en${PAGE_PATH}#resource`,
    name: 'Sight Words Practice Online',
    url: `${BASE_URL}/en${PAGE_PATH}`,
    inLanguage: 'en',
    learningResourceType: 'Game',
    educationalUse: ['Sight Word Practice', 'Reading Fluency', 'High-Frequency Word Recognition', 'Spelling Practice'],
    educationalLevel: ['Early Education', 'Primary'],
    typicalAgeRange: '4-9',
    isAccessibleForFree: true,
    teaches: 'Instant recognition of Dolch and Fry high-frequency sight words, spelling of high-frequency words, reading fluency foundations',
    audience: { '@type': 'EducationalAudience', educationalRole: ['student', 'parent', 'teacher'] },
    provider: {
      '@type': 'EducationalOrganization',
      '@id': `${BASE_URL}/en/education#org`,
      name: 'LexiClash Education',
      url: `${BASE_URL}/en/education`,
    },
  };

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${BASE_URL}/en${PAGE_PATH}#howto`,
    name: 'How to Practice Sight Words with LexiClash',
    description: 'A 10-minute daily routine that turns any Dolch or Fry sight-word list into games.',
    totalTime: 'PT10M',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Load this week\'s list', text: 'Paste 5-15 Dolch or Fry words into a custom word list in the LexiClash teacher dashboard. Bulk import takes under a minute.' },
      { '@type': 'HowToStep', position: 2, name: 'Flashcard warm-up', text: 'Run one 3-minute flashcard round over the list. Students see each word and hear it with the built-in pronunciation.' },
      { '@type': 'HowToStep', position: 3, name: 'Game round', text: 'Play a 5-minute word-matching or spelling-challenge round on the same list, or open the daily Word Hunt grid and race to spot familiar words.' },
      { '@type': 'HowToStep', position: 4, name: 'Make it social', text: 'Pair two students for a 1v1 word duel, or run the list as a whole-class game with a 4-digit join code.' },
    ],
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Education', item: `${BASE_URL}/${locale}/education` },
      { '@type': 'ListItem', position: 3, name: 'Sight Words Practice', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <JsonLd data={faqJsonLd} />
      <JsonLd data={orgJsonLd} />
      <JsonLd data={learningResourceJsonLd} />
      <JsonLd data={howToJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <TopBackLink className="mb-4" />

        {/* Hero banner with per-locale image */}
        <EducationHeroBanner
          title={c.heroTitle}
          subtitle={c.heroSubtitle}
        />

        <section className="grid items-center gap-10 lg:grid-cols-12 mt-12">
          <div className="lg:col-span-8">
            <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">
              {c.badgeText}
            </span>
            <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
              {c.h1Part1} <span className="inline-block rotate-[-2deg] bg-neo-lime px-3 text-neo-navy shadow-hard">{c.h1Part2}</span>
              <br /><span className="text-neo-pink">{c.h1Part3}</span> <span className="text-neo-cyan">{c.h1Part4}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neo-gray-200 sm:text-xl">
              {c.mainParagraph}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href={`/${locale}/daily/word-hunt`} className="rounded-neo border-4 border-neo-black bg-neo-yellow px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl">
                <span className="block text-base sm:text-lg">{c.startWordHuntLabel}</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">{c.freeLabel}</span>
              </Link>
              <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:px-7">
                <span className="block text-base sm:text-lg">{c.duelLabel}</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-80">{c.pairWithStudentLabel}</span>
              </Link>
            </div>
          </div>
        </section>

        <ScrollRevealSection className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            {c.modesHeading.split(/drill sight words/).map((part, i) => (
              <span key={i}>
                {part}
                {i === 0 && <span className="text-neo-lime">drill sight words</span>}
              </span>
            ))}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {c.modes.map((m, idx) => {
              // List-driven drills (flashcards, matching, spelling) live in the
              // teacher dashboard behind a custom word list; the classroom game
              // has its own landing. No retired /practice/* hops here.
              const hrefMap = ['/teacher', '/teacher', '/teacher', '/education/classroom-game'];
              const accentMap = ['border-neo-lime', 'border-neo-cyan', 'border-neo-pink', 'border-neo-purple'];
              return (
                <Link key={idx} href={`/${locale}${hrefMap[idx]}`} className={`group relative rounded-neo border-3 ${accentMap[idx]} bg-neo-navy-light p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg`}>
                  <h3 className="font-neo-display text-lg font-black uppercase">{m.title}</h3>
                  <p className="mt-2 text-sm text-neo-gray-200">{m.desc}</p>
                  <span className="mt-3 inline-block font-neo-display text-xs font-black uppercase tracking-widest text-neo-yellow">{c.practiceNowLabel}</span>
                </Link>
              );
            })}
          </div>
        </ScrollRevealSection>

        <ScrollRevealSection className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            {c.routineHeading.split(/sight-word routine/).map((part, i) => (
              <span key={i}>
                {part}
                {i === 0 && <span className="text-neo-cyan">sight-word routine</span>}
              </span>
            ))}
          </h2>
          <p className="mb-6 max-w-2xl text-sm text-neo-gray-200">{c.routineIntro}</p>
          <div className="space-y-3">
            {c.routineItems.map((p) => (
              <div key={p.step} className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard transition-all hover:shadow-hard-lg hover:-translate-x-0.5 hover:-translate-y-0.5">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-[11px] font-black uppercase tracking-widest text-neo-navy">{p.step}</span>
                  <h3 className="font-neo-display text-base font-black uppercase">{p.focus}</h3>
                </div>
                <p className="mt-2 text-sm text-neo-gray-200">{p.activity}</p>
              </div>
            ))}
          </div>
        </ScrollRevealSection>

        <ScrollRevealSection className="mt-20">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            {c.faqHeading.split(/FAQ/).map((part, i) => (
              <span key={i}>
                {part}
                {i === 0 && <span className="text-neo-pink">FAQ</span>}
              </span>
            ))}
          </h2>
          <div className="space-y-3">
            {c.faqs.map((faq, idx) => (
              <details key={`faq-${idx}`} className="group rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard transition-all open:shadow-hard-lg">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-neo-display font-black uppercase tracking-wide sm:px-6">
                  <span>{faq.q}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded border-2 border-neo-black bg-neo-yellow text-neo-navy transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="border-t-3 border-neo-black bg-neo-navy/40 px-5 py-4 text-sm text-neo-gray-200 sm:px-6 sm:text-base">{faq.a}</div>
              </details>
            ))}
          </div>
        </ScrollRevealSection>

        <section className="mt-20 mb-12 rounded-neo border-4 border-neo-black bg-neo-yellow p-8 text-neo-navy shadow-hard-xl sm:p-12">
          <h2 className="font-neo-display text-4xl font-black leading-[0.95] sm:text-5xl">
            {c.bottomSectionHeading1}
            <br /><span className="bg-neo-navy px-3 text-neo-yellow">{c.bottomSectionHeading2}</span>
          </h2>
          <p className="mt-4 max-w-xl text-base font-bold sm:text-lg">{c.noAppText}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/teacher`} className="rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-yellow shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:text-lg">
              {c.startPracticingLabel}
            </Link>
            <Link href={`/${locale}/education`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg">
              {c.seeEducationHubLabel}
            </Link>
          </div>
        </section>

        <DistrictUpsellStrip />
      </div>
    </main>
  );
}
