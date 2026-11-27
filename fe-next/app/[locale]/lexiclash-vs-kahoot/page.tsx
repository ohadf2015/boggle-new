import type { Metadata } from 'next';
import { KahootGoLimitHonestyStrip } from '@/components/education/KahootGoLimitHonestyStrip';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { copies, resolveVsLocale } from './copy';
import { CompareTable, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Prose, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { splitLead } from '@/components/landing/splitLead';

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

  const [lead, leadRest] = splitLead(c.intro);

  return (
    <LandingPage
      locale={locale}
      play={c.ctaTry.length <= 22 ? { href: `/${locale}/education/classroom-game`, label: c.ctaTry } : undefined}
    >
      <script id="ld-vs-kahoot-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script id="ld-vs-kahoot-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <LandingHero
        eyebrow="LexiClash vs Kahoot"
        title={c.h1}
        lead={lead}
        actions={
          <>
            <LandingButton href={`/${locale}/education/classroom-game`}>{c.ctaTry}</LandingButton>
            <LandingButton href={`/${locale}/education/games-for-teachers`} variant="secondary">
              {c.ctaTeachers}
            </LandingButton>
          </>
        }
        art={LANDING_ART.duel('')}
        artTone="purple"
        more={leadRest ? <p>{leadRest}</p> : undefined}
      >
        <LinkPills items={[{ href: `/${locale}/education/esl-word-games`, label: c.ctaEsl }]} />
      </LandingHero>

      <div className="min-w-0">
        <TeacherProCompareCheckoutStrip locale={locale} />
      </div>

      <Section title={c.tableHeading}>
        <CompareTable columns={[c.thFeature, 'LexiClash', 'Kahoot']} rows={c.rows.map((row) => [...row])} caption={c.pricingNote} />
      </Section>

      <div className="min-w-0">
        <KahootGoLimitHonestyStrip locale={locale} />
      </div>

      <Section title={c.beatsTitle}>
        <TileGrid variant="paper" items={c.beats.map((item) => ({ title: item.title, body: item.desc }))} />
      </Section>

      <Section title={c.kahootWinsTitle}>
        <Prose paper>
          <p>{c.kahootWins}</p>
        </Prose>
      </Section>

      <Section title={c.faqTitle}>
        <FaqList items={c.faqs.map((f) => ({ q: f.q, a: f.a }))} />
      </Section>

      <Section title={c.moreTitle}>
        <TileGrid
          variant="paper"
          items={MORE_COMPARISON_SLUGS.map((slug, i) => ({
            href: `/${locale}/${slug}`,
            title: c.moreComparisons[i].title,
            body: c.moreComparisons[i].desc,
          }))}
        />
      </Section>

      <CtaBand
        tone="cyan"
        title={c.tryTitle}
        body={c.tryBody}
        actions={<LandingButton href={`/${locale}/education/classroom-game`}>{c.tryCta}</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
