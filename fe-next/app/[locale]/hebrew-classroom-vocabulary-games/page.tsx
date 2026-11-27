import type { Metadata } from 'next';
import Link from 'next/link';
import { getHebrewClassroomContent } from './content';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { CheckList, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, Mark, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

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
      images: [{ url: `${BASE_URL}/og-image-he.webp?v=2`, width: 1200, height: 630, alt: c.ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: c.twitterTitle,
      description: c.twitterDescription,
      images: [`${BASE_URL}/og-image-he.webp?v=2`],
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
    <div dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <LandingPage locale={locale} play={{ href: `/${locale}/education/classroom-game`, label: c.ctaPrimaryBtn }}>
        <script id="ld-cvg-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script id="ld-cvg-resource" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(learningResourceJsonLd) }} />
        <script id="ld-cvg-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

        <LandingHero
          eyebrow={c.heroTag}
          title={
            <>
              {c.heroPart1}<Mark>{c.heroHighlight1}</Mark>
              <br />{c.heroPart2}<span className="text-neo-pink">{c.heroHighlight2}</span>
            </>
          }
          lead={c.heroSubtitle}
          actions={
            <>
              <LandingButton href={`/${locale}/education/classroom-game`} className="flex-col gap-0">
                <span className="block">{c.ctaPrimary.label}</span>
                <span className="block text-xs font-bold opacity-70">{c.ctaPrimary.sub}</span>
              </LandingButton>
              <LandingButton href={`/${locale}/education/duels`} variant="secondary" className="flex-col gap-0">
                <span className="block">{c.ctaSecondary.label}</span>
                <span className="block text-xs font-bold opacity-70">{c.ctaSecondary.sub}</span>
              </LandingButton>
            </>
          }
          art={LANDING_ART.languages('')}
          artTone="cyan"
        />

        <div className="min-w-0">
          <TeacherProCompareCheckoutStrip locale={locale} />
        </div>

        <Section
          title={
            <>
              {c.featuresTitlePart}<span className="text-neo-lime">{c.featuresTitleHighlight}</span>.
            </>
          }
        >
          <CheckList items={c.features.map((f) => f.text)} />
        </Section>

        <Section
          title={
            <>
              {c.useCasesTitlePart}<span className="text-neo-cyan">{c.useCasesTitleHighlight}</span> {locale === 'he' ? 'משתמשים' : 'use it'}.
            </>
          }
        >
          <TileGrid
            variant="paper"
            columns={4}
            items={c.useCases.map((u) => ({
              icon: (
                <span className="self-start rounded-full border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-[11px] font-bold uppercase tracking-wide">
                  {u.tag}
                </span>
              ),
              title: u.title,
              body: u.desc,
            }))}
          />
        </Section>

        <Section
          title={
            <>
              {c.faqTitlePart}<span className="text-neo-cyan">{c.faqTitleHighlight}</span>.
            </>
          }
        >
          <FaqList items={c.faqs} />
        </Section>

        <CtaBand
          tone="yellow"
          title={
            <>
              {c.ctaHeading1}
              <br />
              <span className="box-decoration-clone bg-neo-navy px-2 text-neo-yellow">{c.ctaHeading2}</span>
            </>
          }
          body={
            <>
              <p>{c.ctaBody}</p>
              <p className="mt-3 text-sm">
                {c.compareText}{' '}
                <Link href={`/${locale}/lexiclash-vs-wordwall-kahoot-quizlet`} className="font-bold underline decoration-2 underline-offset-2">
                  {c.compareLinkLabel}
                </Link>
              </p>
            </>
          }
          actions={
            <>
              <LandingButton href={`/${locale}/education/classroom-game`}>{c.ctaPrimaryBtn}</LandingButton>
              <LandingButton href={`/${locale}/education`} variant="secondary">
                {c.ctaSecondaryBtn}
              </LandingButton>
            </>
          }
          art={LANDING_ART.trophy('')}
        />
      </LandingPage>
    </div>
  );
}

export const revalidate = 86400;
