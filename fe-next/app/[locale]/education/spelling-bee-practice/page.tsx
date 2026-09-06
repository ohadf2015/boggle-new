import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { getSpellingBeeContent, EDUCATION_LOCALES, type EducationLocale } from './content';
import { EducationHeroBanner } from '@/components/education/EducationHeroBanner';
import { DistrictUpsellStrip } from '@/components/education/DistrictUpsellStrip';
import { HighlightedHeading } from '@/components/education/HighlightedHeading';
import { ScrollRevealSection } from '@/components/education/ScrollRevealSection';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { hreflangAlternates } from '@/lib/seo/hreflang';
import {
  educationBreadcrumbJsonLd,
  educationFaqJsonLd,
  educationLearningResourceJsonLd,
} from '@/lib/seo/educationLanding';
import { educationPageLabel } from '@/lib/seo/educationPageLinks';
import { EducationRelatedLinks } from '@/components/education/EducationRelatedLinks';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/education/spelling-bee-practice';
const SLUG = 'spelling-bee-practice';

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
  const c = getSpellingBeeContent(locale);
  // Indexable in every language we build, not English alone. The 2026-05-30 noindex
  // was correct for a page whose body was hardcoded English with localized meta;
  // `content.ts` has since grown full per-locale blocks and `page.tsx` renders every
  // visible string from them, so five genuinely translated pages were being withheld
  // from search for a reason that had expired. `__tests__/spellingBeeRobots.test.ts`
  // now asserts the premise (no hardcoded English prose in the body) rather than
  // restating it in a comment.
  const isSupportedLocale = EDUCATION_LOCALES.includes(locale as EducationLocale);
  const ogImage = `${BASE_URL}/images/${OG_IMAGE[locale] ?? OG_IMAGE.en}`;
  const ogLocale = OG_LOCALE[locale] ?? 'en_US';
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    keywords: 'spelling bee practice online, online spelling bee practice, spelling bee training, spelling games online, spelling practice free, scripps spelling bee practice, classroom spelling bee, spelling games for kids, spelling bee online, spelling competition practice',
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
    // hreflangAlternates, not a hand-written seven: `app/sitemap.ts` emits the ~24-entry
    // map (regional variants included) from the same helper, and Google discards any
    // annotation the other side does not reciprocate.
    alternates: {
      canonical: pageUrl,
      languages: hreflangAlternates(PAGE_PATH),
    },
    robots: isSupportedLocale ? { index: true, follow: true } : { index: false, follow: true },
  };
}


export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const c = getSpellingBeeContent(locale);

  const faqJsonLd = educationFaqJsonLd({ locale, path: PAGE_PATH, faqs: c.faqs });

  // Name and URL are now the locale's, not `/en`'s: the body is fully translated in
  // all six languages, so a `/ja` build pointing its resource node at the English URL
  // was describing a page that does not exist in Japanese.
  const learningResourceJsonLd = educationLearningResourceJsonLd({
    locale,
    path: PAGE_PATH,
    name: c.metaTitle,
    description: c.metaDescription,
    educationalUse: ['Spelling Practice', 'Spelling Bee Preparation', 'Vocabulary Building', 'Pattern Recognition', 'Competition Training'],
    educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
    typicalAgeRange: '7-18',
    teaches: 'Spelling, letter pattern recognition, word recall under time pressure, vocabulary',
  });

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${BASE_URL}/${locale}${PAGE_PATH}#howto`,
    name: 'How to Practice for a Spelling Bee with LexiClash',
    description: 'Four-step routine for spelling-bee preparation using free word games.',
    totalTime: 'PT15M',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Warm up with Word Hunt', text: 'Play one 90-second Word Hunt round to warm up letter-scanning reflexes.' },
      { '@type': 'HowToStep', position: 2, name: 'Drill with Word Wheel', text: 'Play one Word Wheel round focused on long-word formation. Aim for at least one 7-letter word.' },
      { '@type': 'HowToStep', position: 3, name: '1v1 duel with a peer', text: 'Pair with another competitor and run a 2-3 minute Vocabulary Duel on a custom word list from your grade-level study guide.' },
      { '@type': 'HowToStep', position: 4, name: 'Review missed words', text: 'After each session, review the missed-word list. Add tough words to your custom drill list for tomorrow.' },
    ],
  };

  const breadcrumbJsonLd = educationBreadcrumbJsonLd({
    locale,
    path: PAGE_PATH,
    current: educationPageLabel(SLUG, locale),
  });

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <JsonLd data={faqJsonLd} />
      <JsonLd data={learningResourceJsonLd} />
      {/* English steps — see the vocabulary-games-classroom note. */}
      {locale === 'en' && <JsonLd data={howToJsonLd} />}
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
              <Link href={`/${locale}/practice/wordHunt`} className="rounded-neo border-4 border-neo-black bg-neo-yellow px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl">
                <span className="block text-base sm:text-lg">{c.startWordHuntLabel}</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">{c.freeLabel}</span>
              </Link>
              <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:px-7">
                <span className="block text-base sm:text-lg">{c.duelLabel}</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-80">{c.pairWithCompetitorLabel}</span>
              </Link>
            </div>
          </div>
        </section>

        <ScrollRevealSection className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            <HighlightedHeading
              text={c.drillModesHeading}
              highlight="drill modes"
              highlightClassName="text-neo-lime"
            />
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {c.drillModes.map((m, idx) => {
              const hrefMap = ['/practice/wordHunt', '/practice/wheelRush', '/practice/classic', '/education/duels'];
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
            <HighlightedHeading
              text={c.trainingPlanHeading}
              highlight="training plan"
              highlightClassName="text-neo-cyan"
            />
          </h2>
          <p className="mb-6 max-w-2xl text-sm text-neo-gray-200">{c.trainingPlanIntro}</p>
          <div className="space-y-3">
            {c.trainingPlanItems.map((p) => (
              <div key={p.week} className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard transition-all hover:shadow-hard-lg hover:-translate-x-0.5 hover:-translate-y-0.5">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-[11px] font-black uppercase tracking-widest text-neo-navy">{p.week}</span>
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
            <Link href={`/${locale}/practice/wordHunt`} className="rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-yellow shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:text-lg">
              {c.startDrillingLabel}
            </Link>
            <Link href={`/${locale}/education`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg">
              {c.seeEducationHubLabel}
            </Link>
          </div>
        </section>

        <EducationRelatedLinks locale={locale} slug={SLUG} />

        <DistrictUpsellStrip />
      </div>
    </main>
  );
}
