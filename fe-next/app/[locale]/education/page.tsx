import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { LandingFaq } from '@/components/education/landing/LandingFaq';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { translateKey } from '@/lib/i18n/serverTranslate';
import {
  buildEducationFaqJsonLd,
  buildEducationOrgJsonLd,
  buildEducationBreadcrumbJsonLd,
  buildEducationCourseJsonLd,
  buildEducationWebApplicationJsonLd,
  buildEducationPageJsonLd,
} from '@/lib/seo/educationJsonLd';
import { PageClient as EducationPageClient } from './PageClient';
import { educationSeoContent } from './seoContent';
import { getBrainBreaksContent } from './brain-breaks-word-games/content';
import { getIndoorRecessContent } from './indoor-recess-games/content';
import { getEndOfYearContent } from './end-of-year-classroom-activities/content';
import { getIcebreakersContent } from './first-day-of-school-icebreakers/content';
import { getEarlyFinishersContent } from './early-finishers-activities/content';
import { getMiddleSchoolContent } from './middle-school-word-games/content';
import { educationPageLabel } from '@/lib/seo/educationPageLinks';

// The hub renders from a static content object keyed by locale — no cookies(),
// headers() or searchParams anywhere in the tree, so there is nothing to make it
// per-request. `force-dynamic` arrived incidentally in 506600208 (a Connections
// commit) and cost every visitor a server render. ISR matches /education/for-schools.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'educationHub', path: '/education', locale });
}

export default async function EducationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = educationSeoContent[locale] ?? educationSeoContent.en;
  const faqItems = content.geoAnswer ? [content.geoAnswer, ...content.faq] : content.faq;
  const faqSchema = buildEducationFaqJsonLd(locale, faqItems);
  const orgSchema = buildEducationOrgJsonLd(locale);
  const breadcrumbSchema = buildEducationBreadcrumbJsonLd(locale);
  const courseSchema = buildEducationCourseJsonLd(locale);
  const webAppSchema = buildEducationWebApplicationJsonLd(locale);
  const pageSchema = buildEducationPageJsonLd(locale);
  // Safe: schemas built from static seoContent + locale enum, not user input.
  // JSON.stringify escapes content for <script> context; same pattern as
  // app/[locale]/guides/page.tsx:73 and components/seo/FaqPageJsonLd.tsx.
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <EducationPageClient
        geo={content.geoAnswer}
        faq={<LandingFaq title={translateKey('eg2Land.faq.title', locale, 'Teacher questions')} items={content.faq} />}
      />
      <EducationResourceLinks locale={locale} />
    </>
  );
}

// Server-rendered crawlable internal-link section. Surfaces sub-routes and
// English-only SEO landings to Googlebot + signals their priority via the
// PageRank flow from /education (priority 0.7 in sitemap).
// Every string is a literal eg6Land key so the key guard can see it; translateKey
// falls back to English for any locale that lacks one.

type GuideCard = {
  slug: string;
  tone: string;
  dark: boolean;
  badgeKey: string;
  titleKey: string;
  descKey: string;
};

const GUIDE_CARDS: GuideCard[] = [
  { slug: 'vocabulary-games-classroom', tone: 'bg-neo-cyan text-neo-navy', dark: true, badgeKey: 'eg6Land.guides.vocabBadge', titleKey: 'eg6Land.guides.vocabTitle', descKey: 'eg6Land.guides.vocabDesc' },
  { slug: 'esl-word-games', tone: 'bg-neo-cyan text-neo-navy', dark: true, badgeKey: 'eg6Land.guides.eslBadge', titleKey: 'eg6Land.guides.eslTitle', descKey: 'eg6Land.guides.eslDesc' },
  { slug: 'games-for-teachers', tone: 'bg-neo-purple text-neo-black', dark: true, badgeKey: 'eg6Land.guides.teachersBadge', titleKey: 'eg6Land.guides.teachersTitle', descKey: 'eg6Land.guides.teachersDesc' },
  { slug: 'spelling-bee-practice', tone: 'bg-neo-pink text-neo-black', dark: true, badgeKey: 'eg6Land.guides.spellingBadge', titleKey: 'eg6Land.guides.spellingTitle', descKey: 'eg6Land.guides.spellingDesc' },
  { slug: 'sight-words-practice', tone: 'bg-neo-lime text-neo-navy', dark: true, badgeKey: 'eg6Land.guides.sightBadge', titleKey: 'eg6Land.guides.sightTitle', descKey: 'eg6Land.guides.sightDesc' },
  { slug: 'for-schools', tone: 'bg-neo-navy text-neo-lime', dark: false, badgeKey: 'eg6Land.guides.schoolsBadge', titleKey: 'eg6Land.guides.schoolsTitle', descKey: 'eg6Land.guides.schoolsDesc' },
  { slug: 'lists', tone: 'bg-neo-cyan text-neo-navy', dark: true, badgeKey: 'eg6Land.guides.listsBadge', titleKey: 'eg6Land.guides.listsTitle', descKey: 'eg6Land.guides.listsDesc' },
];

function EducationResourceLinks({ locale }: { locale: string }) {
  const resourcesAriaLabel = translateKey('education.landing.resourcesAriaLabel', locale, 'Education resources');

  return (
    <section aria-label={resourcesAriaLabel} className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 border-t-3 border-neo-black/30">
      {/* ~19 SEO cards under three headings were 5-6 of the landing's 17+
          screens at 390px, standing between a first-time teacher and the FAQ.
          A native <details> collapses them to one row while every link still
          ships in the server HTML for crawlers (the EducationFAQ precedent). */}
      <details data-testid="education-resources" className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <h2 className="font-neo-display text-2xl sm:text-3xl font-black uppercase text-neo-white">
            {translateKey('eg6Land.resources.heading', locale)}
          </h2>
          <span aria-hidden className="shrink-0 text-3xl font-black text-neo-lime transition-transform duration-150 group-open:rotate-45 motion-reduce:transition-none">+</span>
        </summary>
        <p className="mt-2 max-w-2xl text-sm sm:text-base text-neo-gray-200">{translateKey('eg6Land.resources.subhead', locale)}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            href={`/${locale}/education/duels`}
            className="group rounded-neo border-3 border-neo-black bg-neo-pink p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
          >
            <h3 className="font-neo-display text-lg font-black uppercase text-neo-black">{translateKey('eg6Land.resources.duelsTitle', locale)}</h3>
            <p className="mt-2 text-sm text-neo-black">{translateKey('eg6Land.resources.duelsDesc', locale)}</p>
            <DirectionalIcon icon={ArrowRight} className="mt-3 inline-block size-4 text-neo-black" />
          </Link>
          <Link
            href={`/${locale}/education/classroom-game`}
            className="group rounded-neo border-3 border-neo-black bg-neo-cyan p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
          >
            <h3 className="font-neo-display text-lg font-black uppercase text-neo-navy">{translateKey('eg6Land.resources.classroomTitle', locale)}</h3>
            <p className="mt-2 text-sm text-neo-navy/90">{translateKey('eg6Land.resources.classroomDesc', locale)}</p>
            <DirectionalIcon icon={ArrowRight} className="mt-3 inline-block size-4 text-neo-navy" />
          </Link>
        </div>

        <h2 className="mt-12 font-neo-display text-2xl sm:text-3xl font-black uppercase text-neo-white">
          {translateKey('eg6Land.guides.heading', locale)}
        </h2>
        <p className="mt-2 max-w-2xl text-sm sm:text-base text-neo-gray-200">{translateKey('eg6Land.guides.subhead', locale)}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDE_CARDS.map((card) => (
            <Link
              key={card.slug}
              href={`/${locale}/education/${card.slug}`}
              className={
                card.dark
                  ? 'rounded-neo border-3 border-neo-cream/40 bg-neo-navy-light p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg'
                  : 'rounded-neo border-3 border-neo-black bg-neo-lime p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg'
              }
              {...(card.slug === 'for-schools' ? { 'data-ph-capture-attribute-source': 'edu_hub_for_schools_card' } : {})}
            >
              <span className={`inline-block border-2 border-neo-black px-2 py-0.5 font-neo-display text-xs font-black uppercase tracking-widest ${card.tone}`}>
                {translateKey(card.badgeKey, locale)}
              </span>
              <h3 className={`mt-3 font-neo-display text-base font-black uppercase ${card.dark ? 'text-neo-white' : 'text-black'}`}>
                {translateKey(card.titleKey, locale)}
              </h3>
              <p className={`mt-2 text-xs ${card.dark ? 'text-neo-gray-200' : 'text-black/70'}`}>{translateKey(card.descKey, locale)}</p>
            </Link>
          ))}
        </div>

        <TeacherMomentLinks locale={locale} />
        <EnglishLearnerLinks locale={locale} />

        {/* Comparison page earns organic traffic for "LexiClash vs Kahoot" but is under-linked
            from high-authority education hub — text link adds PageRank flow with zero layout change.
            Three keys, not a split on the anchor: a reworded anchor must not silently drop the link. */}
        <p className="mt-6 text-sm text-neo-gray-300">
          {translateKey('eg6Land.compare.before', locale)}
          <Link href={`/${locale}/lexiclash-vs-kahoot`} className="underline underline-offset-2 hover:text-neo-white">
            {translateKey('eg6Land.compare.anchor', locale)}
          </Link>
          {translateKey('eg6Land.compare.after', locale)}
        </p>
      </details>
    </section>
  );
}

// ─── Teacher-moment landings ───
// These six pages were orphans: reachable from the sitemap but linked from
// nowhere, which is a weak discovery signal and passes no internal PageRank.
// Labels come from each page's own localized content file rather than a new
// translation block, so there is exactly one place the copy lives.
// Accent colours are per-slug CSS classes, not copy, so they stay out of t().
const MOMENT_ACCENT: Record<string, string> = {
  'brain-breaks-word-games': 'text-neo-lime',
  'indoor-recess-games': 'text-neo-cyan',
  'end-of-year-classroom-activities': 'text-neo-pink-light',
  'first-day-of-school-icebreakers': 'text-neo-purple-light',
  'early-finishers-activities': 'text-neo-lime',
  'middle-school-word-games': 'text-neo-pink-light',
};

function TeacherMomentLinks({ locale }: { locale: string }) {
  const moments = [
    { slug: 'brain-breaks-word-games', c: getBrainBreaksContent(locale) },
    { slug: 'indoor-recess-games', c: getIndoorRecessContent(locale) },
    { slug: 'end-of-year-classroom-activities', c: getEndOfYearContent(locale) },
    { slug: 'first-day-of-school-icebreakers', c: getIcebreakersContent(locale) },
    { slug: 'early-finishers-activities', c: getEarlyFinishersContent(locale) },
    { slug: 'middle-school-word-games', c: getMiddleSchoolContent(locale) },
  ];

  return (
    <>
      <h2 className="mt-12 font-neo-display text-2xl font-black uppercase text-neo-white sm:text-3xl">
        {translateKey('eg6Land.moments.heading', locale)}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-neo-gray-200 sm:text-base">{translateKey('eg6Land.moments.subhead', locale)}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {moments.map(({ slug, c }) => (
          <Link
            key={slug}
            href={`/${locale}/education/${slug}`}
            className="rounded-neo border-3 border-neo-cream/40 bg-neo-navy-light p-5 shadow-hard transition-transform duration-150 ease-out hover:-translate-y-0.5"
          >
            <h3 className={`font-neo-display text-base font-black uppercase ${MOMENT_ACCENT[slug]}`}>
              {c.breadcrumb.current}
            </h3>
            {/* The answer-first question doubles as the card's promise. Only the
                six teacher-moment landings feed this rail, and every one of them
                has an answer block — the guard is for the type, not for them. */}
            {c.answer && (
              <p className="mt-2 text-xs leading-relaxed text-neo-gray-200">{c.answer.question}</p>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}

const LEARNER_SLUGS = [
  'english-games-elementary',
  'english-games-middle-school',
  'english-games-adults',
  'irregular-verbs-games',
  'english-vocabulary-topics',
] as const;

const LEARNER_ACCENT: Record<(typeof LEARNER_SLUGS)[number], string> = {
  'english-games-elementary': 'text-neo-lime',
  'english-games-middle-school': 'text-neo-pink-light',
  'english-games-adults': 'text-neo-purple-light',
  'irregular-verbs-games': 'text-neo-cyan',
  'english-vocabulary-topics': 'text-neo-lime',
};

function EnglishLearnerLinks({ locale }: { locale: string }) {
  return (
    <>
      <h2 className="mt-12 font-neo-display text-2xl font-black uppercase text-neo-white sm:text-3xl">
        {translateKey('eg6Land.learner.heading', locale)}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-neo-gray-200 sm:text-base">{translateKey('eg6Land.learner.subhead', locale)}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LEARNER_SLUGS.map((slug) => (
          <Link
            key={slug}
            href={`/${locale}/education/${slug}`}
            className="rounded-neo border-3 border-neo-cream/40 bg-neo-navy-light p-5 shadow-hard transition-transform duration-150 ease-out hover:-translate-y-0.5"
          >
            <h3 className={`font-neo-display text-base font-black uppercase ${LEARNER_ACCENT[slug]}`}>
              {educationPageLabel(slug, locale)}
            </h3>
          </Link>
        ))}
      </div>
    </>
  );
}
