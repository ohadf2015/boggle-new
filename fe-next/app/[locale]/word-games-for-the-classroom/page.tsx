import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { GeoFaqList } from '@/components/seo/GeoFaqList';
import { getClassroomContent } from './content';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { TeacherAccessCTA } from '@/components/education/TeacherAccessCTA';
import { CLASSROOM_WORD_GAMES_BASE, CLASSROOM_WORD_GAMES_PATH, buildClassroomWordGamesJsonLd } from './jsonld';
import { CtaBand, LandingButton, LandingHero, LandingPage, LinkPills, Prose, Section, Steps, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

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
  const pageUrl = `${CLASSROOM_WORD_GAMES_BASE}/en${CLASSROOM_WORD_GAMES_PATH}`;
  const c = getClassroomContent(locale);

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    keywords: 'word games for the classroom, classroom word games, free word games classroom, word games no login, word games no download, online word games classroom, word games for students, free educational games no login, whole class word game',
    openGraph: {
      title: c.ogTitle,
      description: c.ogDescription,
      locale: OG_LOCALE[locale] ?? 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${CLASSROOM_WORD_GAMES_BASE}/images/education-hero-en.webp`, width: 1200, height: 675, alt: c.ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: c.twitterTitle,
      description: c.twitterDescription,
      images: [`${CLASSROOM_WORD_GAMES_BASE}/images/education-hero-en.webp`],
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
  const c = getClassroomContent(locale);
  const { webPage, faqPage, breadcrumb } = buildClassroomWordGamesJsonLd(locale, c);

  const moreHrefs = [
    `/${locale}/substitute-teacher-word-games`,
    `/${locale}/bell-ringer-word-games`,
    `/${locale}/education`,
  ];

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/education/classroom-game`, label: c.ctaStart }}>
      <JsonLd data={webPage} />
      <JsonLd data={faqPage} />
      <JsonLd data={breadcrumb} />

      <LandingHero
        title={c.heroTitle}
        actions={
          <>
            <LandingButton href={`/${locale}/education/classroom-game`}>{c.ctaStart}</LandingButton>
            <LandingButton href={`/${locale}/education/duels`} variant="secondary">
              {c.ctaCduel}
            </LandingButton>
          </>
        }
        art={LANDING_ART.friends('')}
        artTone="lime"
      >
        <LinkPills items={[{ href: `/${locale}/vocabulary-games-for-middle-school`, label: c.ctaMiddleSchool }]} />
      </LandingHero>

      <section data-answer className="rounded-neo-lg border-3 border-neo-black bg-neo-cream p-5 text-neo-black shadow-hard-xl sm:p-8">
        <h2 className="font-neo-display text-xl font-bold leading-tight sm:text-2xl">{c.geoQuestion}</h2>
        <p className="mt-4 max-w-[70ch] text-base leading-relaxed sm:text-lg">{c.intro}</p>
      </section>

      {c.spellingListAnswer && (
        <Section title={c.spellingListAnswer.question}>
          <Prose>
            {c.spellingListAnswer.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </Prose>
        </Section>
      )}

      <div className="min-w-0">
        <TeacherProCompareCheckoutStrip locale={locale} />
      </div>

      <Section title={c.fitsTitle}>
        <TileGrid variant="paper" columns={c.fits.length % 3 === 0 ? 3 : 2} items={c.fits.map((f) => ({ title: f.title, body: f.desc }))} />
      </Section>

      <Section title={c.stepsTitle}>
        <Steps items={c.steps.map((s) => ({ title: s.t, body: s.d }))} />
      </Section>

      <GeoFaqList title={c.faqTitle} items={c.faqs} />

      <Section title={c.moreTitle}>
        <TileGrid items={c.moreCards.map((card, i) => ({ href: moreHrefs[i], title: card.title, body: card.sub }))} />
      </Section>

      <CtaBand
        tone="cyan"
        title={c.finalTitle}
        body={c.finalBody}
        actions={<LandingButton href={`/${locale}/education/classroom-game`}>{c.finalCta}</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
      <TeacherAccessCTA />
    </LandingPage>
  );
}
