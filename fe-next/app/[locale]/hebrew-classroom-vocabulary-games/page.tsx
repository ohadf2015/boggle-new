import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { getHebrewClassroomContent } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/hebrew-classroom-vocabulary-games';

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
  const c = getHebrewClassroomContent(locale);
  const pageUrl = `${BASE_URL}/${locale}${PAGE_PATH}`;
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    keywords: 'משחקי מילים לכיתה, משחקים לימודיים, משחק אוצר מילים, העשרת אוצר מילים, כלים דיגיטליים למורים, פעילות לכיתה, משחקי מילים בעברית, משחקי מילים למורים, משחק מילים אונליין לכיתה, משחקי מילים חינם',
    openGraph: {
      title: c.ogTitle,
      description: c.ogDescription,
      locale: OG_LOCALE[locale] ?? 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-he.webp`, width: 1200, height: 630, alt: c.ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: c.twitterTitle,
      description: c.twitterDescription,
      images: [`${BASE_URL}/og-image-he.webp`],
    },
    alternates: {
      canonical: `${BASE_URL}/he${PAGE_PATH}`,
      languages: {
        'x-default': `${BASE_URL}/en${PAGE_PATH}`,
        en: `${BASE_URL}/en${PAGE_PATH}`,
        he: `${BASE_URL}/he${PAGE_PATH}`,
        sv: `${BASE_URL}/sv${PAGE_PATH}`,
        ja: `${BASE_URL}/ja${PAGE_PATH}`,
        es: `${BASE_URL}/es${PAGE_PATH}`,
        ru: `${BASE_URL}/ru${PAGE_PATH}`,
        'he-IL': `${BASE_URL}/he${PAGE_PATH}`,
        'en-IL': `${BASE_URL}/en${PAGE_PATH}`,
        'en-US': `${BASE_URL}/en${PAGE_PATH}`,
      },
    },
    robots: { index: locale === 'he', follow: true },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const c = getHebrewClassroomContent(locale);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/he${PAGE_PATH}#faq`,
    inLanguage: 'he',
    mainEntity: c.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const learningResourceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${BASE_URL}/he${PAGE_PATH}#resource`,
    name: c.metaTitle,
    url: `${BASE_URL}/${locale}${PAGE_PATH}`,
    inLanguage: locale,
    learningResourceType: 'Game',
    educationalUse: ['Vocabulary Building', 'Classroom Activity', 'Hebrew Immersion', 'Formative Assessment', 'ESL Practice'],
    educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
    typicalAgeRange: '8-99',
    isAccessibleForFree: true,
    teaches: c.metaDescription,
    audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
    provider: {
      '@type': 'EducationalOrganization',
      '@id': `${BASE_URL}/${locale}/education#org`,
      name: 'LexiClash Education',
      url: `${BASE_URL}/${locale}/education`,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: locale === 'he' ? 'בית' : 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: locale === 'he' ? 'חינוך' : 'Education', item: `${BASE_URL}/${locale}/education` },
      { '@type': 'ListItem', position: 3, name: c.metaTitle, item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main dir={locale === 'he' ? 'rtl' : 'ltr'} className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <Script id="ld-cvg-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-cvg-resource" type="application/ld+json">{JSON.stringify(learningResourceJsonLd)}</Script>
      <Script id="ld-cvg-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">

        <section className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">
              {c.heroTag}
            </span>
            <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
              {c.heroPart1}<span className="inline-block rotate-[-2deg] bg-neo-lime px-3 text-neo-navy shadow-hard">{c.heroHighlight1}</span>
              <br />{c.heroPart2}<span className="text-neo-pink">{c.heroHighlight2}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neo-gray-200 sm:text-xl">
              {c.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-yellow px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-all hover:translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl">
                <span className="block text-base sm:text-lg">{c.ctaPrimary.label}</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">{c.ctaPrimary.sub}</span>
              </Link>
              <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:px-7">
                <span className="block text-base sm:text-lg">{c.ctaSecondary.label}</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-80">{c.ctaSecondary.sub}</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            {c.featuresTitlePart}<span className="text-neo-lime">{c.featuresTitleHighlight}</span>.
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {c.features.map((f, i) => (
              <li key={f.text} className="flex items-start gap-4 rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard"
                  style={{ transform: i % 3 === 0 ? 'rotate(-0.4deg)' : i % 3 === 1 ? 'rotate(0.3deg)' : 'rotate(0deg)' }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-neo border-3 border-neo-black bg-neo-lime text-xl shadow-hard-sm" aria-hidden="true">{f.icon}</span>
                <p className="pt-1.5 text-sm sm:text-base">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            {c.useCasesTitlePart}<span className="text-neo-cyan">{c.useCasesTitleHighlight}</span> {locale === 'he' ? 'משתמשים' : 'use it'}.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.useCases.map((u) => (
              <div key={u.title} className="relative rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard">
                <span className="absolute -top-3 right-3 border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-navy">{u.tag}</span>
                <h3 className="mt-2 font-neo-display text-base font-black">{u.title}</h3>
                <p className="mt-2 text-sm text-neo-gray-200">{u.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            {c.faqTitlePart}<span className="text-neo-cyan">{c.faqTitleHighlight}</span>.
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
        </section>

        <section className="mt-20 mb-12 rounded-neo border-4 border-neo-black bg-neo-yellow p-8 text-neo-navy shadow-hard-xl sm:p-12">
          <h2 className="font-neo-display text-4xl font-black leading-[0.95] sm:text-5xl">
            {c.ctaHeading1}
            <br /><span className="bg-neo-navy px-3 text-neo-yellow">{c.ctaHeading2}</span>
          </h2>
          <p className="mt-4 max-w-xl text-base font-bold sm:text-lg">{c.ctaBody}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-yellow shadow-hard-lg transition-all hover:translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:text-lg">
              {c.ctaPrimaryBtn}
            </Link>
            <Link href={`/${locale}/education`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg">
              {c.ctaSecondaryBtn}
            </Link>
          </div>
          <p className="mt-6 text-sm font-bold text-neo-navy/70">
            {c.compareText}{' '}
            <Link href={`/${locale}/lexiclash-vs-wordwall-kahoot-quizlet`} className="underline decoration-2 underline-offset-2 hover:text-neo-navy">
              {c.compareLinkLabel}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export const revalidate = 86400;
