import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { getGamesForTeachersContent, EDUCATION_LOCALES, type EducationLocale } from './content';
import { EducationHeroBanner } from '@/components/education/EducationHeroBanner';
import { TeacherAccessCTA } from '@/components/education/TeacherAccessCTA';
import { DistrictUpsellStrip } from '@/components/education/DistrictUpsellStrip';
import { ScrollRevealSection } from '@/components/education/ScrollRevealSection';
import { TopBackLink } from '@/components/navigation/TopBackLink';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/education/games-for-teachers';

const OG_IMAGE: Record<string, string> = {
  en: 'education-hero-en.webp',
  he: 'education-hero-he.webp',
  sv: 'education-hero-sv.webp',
  ja: 'education-hero-ja.webp',
  es: 'education-hero-es.webp',
  ru: 'education-hero-en.webp',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = EDUCATION_LOCALES.includes(locale as EducationLocale);
  const pageUrl = `${BASE_URL}/${locale}${PAGE_PATH}`;
  const c = getGamesForTeachersContent(locale);
  const ogLocale = locale === 'he' ? 'he_IL' : locale === 'es' ? 'es_ES' : locale === 'sv' ? 'sv_SE' : locale === 'ja' ? 'ja_JP' : locale === 'ru' ? 'ru_RU' : 'en_US';
  const ogImage = `${BASE_URL}/images/${OG_IMAGE[locale as EducationLocale] ?? OG_IMAGE.en}`;
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    keywords: 'word games for teachers, vocabulary games for teachers, classroom games for teachers, teacher word games, free games for teachers, classroom activities for teachers, no-prep classroom games, sub day word games, brain break word games, teacher vocabulary tools',
    openGraph: {
      title: c.ogTitle,
      description: c.ogDescription,
      locale: ogLocale,
      type: 'website',
      url: pageUrl,
      images: [{ url: ogImage, width: 1200, height: 675, alt: c.ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: c.ogTitle,
      description: c.twitterDescription,
      images: [ogImage],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en${PAGE_PATH}`,
        en: `${BASE_URL}/en${PAGE_PATH}`,
        he: `${BASE_URL}/he${PAGE_PATH}`,
        sv: `${BASE_URL}/sv${PAGE_PATH}`,
        ja: `${BASE_URL}/ja${PAGE_PATH}`,
        es: `${BASE_URL}/es${PAGE_PATH}`,
        ru: `${BASE_URL}/ru${PAGE_PATH}`,
      },
    },
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
  };
}



export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const c = getGamesForTeachersContent(locale);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/${locale}${PAGE_PATH}#faq`,
    mainEntity: c.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const learningResourceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${BASE_URL}/${locale}${PAGE_PATH}#resource`,
    name: c.metaTitle,
    url: `${BASE_URL}/${locale}${PAGE_PATH}`,
    inLanguage: 'en',
    learningResourceType: 'Activity',
    educationalUse: ['Classroom Activity', 'Formative Assessment', 'Vocabulary Building', 'Brain Break', 'Substitute Teacher Activity'],
    educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
    typicalAgeRange: '8-99',
    isAccessibleForFree: true,
    teaches: 'Vocabulary, spelling, word recognition, contextual usage',
    audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
    provider: {
      '@type': 'EducationalOrganization',
      '@id': `${BASE_URL}/en/education#org`,
      name: 'LexiClash Education',
      url: `${BASE_URL}/en/education`,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Education', item: `${BASE_URL}/${locale}/education` },
      { '@type': 'ListItem', position: 3, name: 'Games for Teachers', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <JsonLd data={faqJsonLd} />
      <JsonLd data={learningResourceJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <TopBackLink className="mb-4" />

        {/* Hero banner with per-locale image */}
        <EducationHeroBanner
          title={`${c.heroH1.part1} ${c.heroH1.highlight} ${c.heroH1.part2}`}
          subtitle={c.heroSubtitle}
        />

        <section className="grid items-center gap-10 lg:grid-cols-12 mt-12">
          <div className="lg:col-span-8">
            <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-purple px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-white shadow-hard">
              {c.heroTag}
            </span>
            <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
              {c.heroH1.part1} <span className="inline-block rotate-[-2deg] bg-neo-purple px-3 text-neo-white shadow-hard">{c.heroH1.highlight}</span>
              <br /><span className="text-neo-lime">{c.heroH1.part2}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neo-gray-200 sm:text-xl">
              {c.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-purple px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl">
                <span className="block text-base sm:text-lg">{c.heroCtaStartGame}</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">{c.ctaSubLabel}</span>
              </Link>
              <Link href={`/${locale}/education`} className="rounded-neo border-4 border-neo-black bg-neo-cyan px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:px-7">
                <span className="block text-base sm:text-lg">{c.heroCtaTeacherHub}</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">{c.heroCtaTeacherHubSub}</span>
              </Link>
            </div>
          </div>
        </section>

        <ScrollRevealSection className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            {c.whatYouGetTitle}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {c.features.map((f, i) => (
              <li key={f.text} className="flex items-start gap-4 rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard transition-all hover:shadow-hard-lg hover:-translate-x-0.5 hover:-translate-y-0.5"
                  style={{ transform: i % 3 === 0 ? 'rotate(-0.4deg)' : i % 3 === 1 ? 'rotate(0.3deg)' : 'rotate(0deg)' }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-neo border-3 border-neo-black bg-neo-purple text-xl shadow-hard-sm" aria-hidden="true">{f.icon}</span>
                <p className="pt-1.5 text-sm sm:text-base">{f.text}</p>
              </li>
            ))}
          </ul>
        </ScrollRevealSection>

        <ScrollRevealSection className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            {c.sections.howYouUse}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.useCases.map((u) => (
              <div key={u.title} className="relative rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard transition-all hover:shadow-hard-lg hover:-translate-x-0.5 hover:-translate-y-0.5">
                <span className="absolute -top-3 left-3 border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-navy">{u.tag}</span>
                <h3 className="mt-2 font-neo-display text-base font-black">{u.title}</h3>
                <p className="mt-2 text-sm text-neo-gray-200">{u.desc}</p>
              </div>
            ))}
          </div>
        </ScrollRevealSection>

        <ScrollRevealSection className="mt-20">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            {c.faqTitle}
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

        <nav className="mt-16 flex flex-wrap gap-3 text-sm font-bold" aria-label={c.relatedResourcesAriaLabel}>
          <Link href={`/${locale}/education/vocabulary-games-classroom`} className="rounded-neo border-2 border-neo-black bg-neo-navy-light px-4 py-2 text-neo-lime transition-all hover:bg-neo-navy">{c.relatedVocabLink}</Link>
          <Link href={`/${locale}/education/esl-word-games`} className="rounded-neo border-2 border-neo-black bg-neo-navy-light px-4 py-2 text-neo-cyan transition-all hover:bg-neo-navy">{c.relatedEslLink}</Link>
          <Link href={`/${locale}/education`} className="rounded-neo border-2 border-neo-black bg-neo-navy-light px-4 py-2 text-neo-white transition-all hover:bg-neo-navy">{c.relatedEducationLink}</Link>
        </nav>

        <section className="mt-12 mb-12 rounded-neo border-4 border-neo-black bg-neo-purple p-8 text-neo-white shadow-hard-xl sm:p-12">
          <h2 className="font-neo-display text-4xl font-black leading-[0.95] sm:text-5xl">
            {c.sections.ctaHeading}
            <br /><span className="bg-neo-navy px-3 text-neo-purple">{c.sections.ctaSubtitle}</span>
          </h2>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-purple shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:text-lg">
              {c.sections.ctaPrimaryButtonLabel}
            </Link>
            <Link href={`/${locale}/education/vocabulary-games-classroom`} className="rounded-neo border-4 border-neo-black bg-neo-cyan px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-navy shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg">
              {c.sections.ctaSecondaryButtonLabel}
            </Link>
          </div>
        </section>

        <TeacherAccessCTA />
        <DistrictUpsellStrip hideTeacherCta />
      </div>
    </main>
  );
}
