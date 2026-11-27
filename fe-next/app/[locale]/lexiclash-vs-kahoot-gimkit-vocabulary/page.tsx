import type { Metadata } from 'next';
import { getComparisonContent } from './content';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { CompareTable, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { splitLead } from '@/components/landing/splitLead';

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

  const [lead, leadRest] = splitLead(c.intro);
  const playHref = `/${locale}/education/classroom-game`;

  return (
    <LandingPage locale={locale} play={c.ctaPlayClass.length <= 22 ? { href: playHref, label: c.ctaPlayClass } : undefined}>
      <script id="ld-vs-classroom-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script id="ld-vs-classroom-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <LandingHero
        eyebrow="Kahoot · Gimkit · Vocabulary.com"
        title={c.heroTitle}
        lead={lead}
        actions={
          <>
            <LandingButton href={playHref}>{c.ctaPlayClass}</LandingButton>
            <LandingButton href={`/${locale}/education/for-schools`} variant="secondary">
              {c.ctaForSchools}
            </LandingButton>
          </>
        }
        art={LANDING_ART.trophy('')}
        artTone="lime"
        more={leadRest ? <p>{leadRest}</p> : undefined}
      />

      <div className="min-w-0">
        <TeacherProCompareCheckoutStrip locale={locale} />
      </div>

      <Section title={c.comparisonTitle}>
        <CompareTable
          columns={[c.comparisonTableFeatureHeader, 'LexiClash', 'Kahoot', 'Gimkit', 'Vocabulary.com']}
          rows={c.compareRows.map((row) => [...row])}
          caption={c.comparePricingFooter}
        />
      </Section>

      <Section title={c.whyTitle}>
        <TileGrid columns={2} variant="paper" items={c.whyCards.map((item) => ({ title: item.title, body: item.desc }))} />
      </Section>

      <Section title={c.whenTitle} intro={c.whenFinal}>
        <TileGrid
          items={[
            { title: 'Kahoot', body: c.whenKahoots, tone: 'purple' },
            { title: 'Gimkit', body: c.whenGimkits, tone: 'cyan' },
            { title: 'Vocabulary.com', body: c.whenVocabularys, tone: 'yellow' },
          ]}
        />
      </Section>

      <Section title={c.faqTitle}>
        <FaqList items={c.faqs} />
      </Section>

      <Section title={c.moreTitle}>
        <TileGrid
          variant="paper"
          items={c.moreCards.map((card, i) => ({ href: moreHrefs[i], title: card.title, body: card.sub }))}
        />
      </Section>

      <CtaBand
        tone="pink"
        title={c.finalTitle}
        body={c.finalBody}
        actions={
          <>
            <LandingButton href={playHref}>{c.finalCtaPlay}</LandingButton>
            <LandingButton href={`/${locale}/education/for-schools`} variant="secondary">
              {c.finalCtaSchools}
            </LandingButton>
          </>
        }
        art={LANDING_ART.friends('')}
      />
    </LandingPage>
  );
}
