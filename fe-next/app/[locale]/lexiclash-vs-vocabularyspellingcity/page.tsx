import type { Metadata } from 'next';
import { getComparisonContent } from './content';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { CompareTable, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Prose, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { splitLead } from '@/components/landing/splitLead';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-vocabularyspellingcity';

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
    keywords: 'lexiclash vs vocabularyspellingcity, vocabularyspellingcity alternative, spellingcity alternative, free spellingcity alternative, spelling city alternative, alternatives to spellingcity, free spelling game classroom, multiplayer spelling game, custom spelling list game',
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
      { '@type': 'ListItem', position: 2, name: 'Comparisons', item: `${BASE_URL}/${locale}/best-online-word-games` },
      { '@type': 'ListItem', position: 3, name: c.metaTitle, item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  const moreHrefs = [
    `/${locale}/lexiclash-vs-quizlet`,
    `/${locale}/lexiclash-vs-flocabulary`,
    `/${locale}/education`,
  ];

  const [lead, leadRest] = splitLead(c.intro);
  const playHref = `/${locale}/education/classroom-game`;

  return (
    <LandingPage locale={locale} play={c.ctaStart.length <= 22 ? { href: playHref, label: c.ctaStart } : undefined}>
      <script id="ld-vs-spellingcity-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script id="ld-vs-spellingcity-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <LandingHero
        eyebrow="LexiClash vs SpellingCity"
        title={c.heroTitle}
        lead={lead}
        actions={
          <>
            <LandingButton href={playHref}>{c.ctaStart}</LandingButton>
            <LandingButton href={`/${locale}/education/spelling-bee-practice`} variant="secondary">
              {c.ctaSpelling}
            </LandingButton>
          </>
        }
        art={LANDING_ART.reading('')}
        artTone="cyan"
        more={leadRest ? <p>{leadRest}</p> : undefined}
      >
        <LinkPills items={[{ href: `/${locale}/education/duels`, label: c.ctaDuels }]} />
      </LandingHero>

      <div className="min-w-0">
        <TeacherProCompareCheckoutStrip locale={locale} />
      </div>

      <Section title={c.compareTitle}>
        <CompareTable
          columns={['Feature', 'LexiClash', 'SpellingCity']}
          rows={c.compareRows.map((row) => [...row])}
          caption={c.compareFootnote}
        />
      </Section>

      <Section title={c.beatsTitle}>
        <TileGrid columns={2} items={c.beats.map((item) => ({ title: item.title, body: item.desc }))} />
      </Section>

      <Section title={c.stillWinsTitle}>
        <Prose paper>
          <p>{c.stillWinsBody}</p>
        </Prose>
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
        tone="yellow"
        title={c.finalTitle}
        body={c.finalBody}
        actions={<LandingButton href={playHref}>{c.finalCta}</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
