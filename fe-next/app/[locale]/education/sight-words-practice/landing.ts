import { educationBreadcrumbLabels, type EducationLandingContent } from '@/lib/seo/educationLanding';
import { getSightWordsContent } from './content';
import { sightWordsExtraJsonLd } from './jsonLd';
import { educationPageLabel } from '@/lib/seo/educationPageLinks';

const SLUG = 'sight-words-practice';

/** Carried over verbatim from the page's old inline metadata export. */
const KEYWORDS =
  'sight words practice, dolch sight words, fry sight words, sight word games, sight word activities, high frequency words practice, dolch word list games, fry first 100 words, sight word flashcards online, kindergarten sight words games';

/** Each practice-mode card links to the mode it names. Order matters. */
const MODE_HREFS = ['/daily/word-hunt', '/daily/word-wheel', '/singleplayer', '/education/duels'];
/**
 * Adapter onto the shared landing shape. The copy above is untouched — this
 * only re-labels it for `components/education/EducationLandingTemplate`.
 * `__tests__/landingTextParity.test.tsx` diffs rendered text, link targets and
 * metadata against pre-migration snapshots.
 */
export function getSightWordsLanding(locale: string): EducationLandingContent {
  const c = getSightWordsContent(locale);
  const bc = educationBreadcrumbLabels(locale);
  return {
    accent: 'lime',
    meta: {
      title: c.metaTitle,
      description: c.metaDescription,
      keywords: KEYWORDS,
    },
    hero: {
      facts: [],
      tag: c.badgeText,
      h1: { part1: c.h1Part1, highlight: c.h1Part2, part2: `${c.h1Part3} ${c.h1Part4}` },
      subtitle: c.mainParagraph,
      primaryCta: { label: c.startWordHuntLabel, sublabel: c.freeLabel, href: '/daily/word-hunt' },
      secondaryCta: { label: c.duelLabel, sublabel: c.pairWithStudentLabel, href: '/education/duels' },
    },
    heroBanner: { title: c.heroTitle, subtitle: c.heroSubtitle },
    sections: [
      {
        kind: 'cards',
        title: c.modesHeading,
        items: c.modes.map((m, i) => ({
          title: m.title,
          desc: m.desc,
          href: MODE_HREFS[i],
          cta: c.practiceNowLabel,
        })),
      },
      {
        kind: 'cards',
        title: c.routineHeading,
        intro: c.routineIntro,
        items: c.routineItems.map((p) => ({ tag: p.step, title: p.focus, desc: p.activity })),
      },
      { kind: 'depth', sections: c.depth },
    ],
    revealSections: true,
    faqs: c.faqs,
    labels: { faqTitle: c.faqHeading, relatedTitle: c.faqHeading },
    related: [],
    footerCta: {
      heading: c.bottomSectionHeading1,
      highlight: c.bottomSectionHeading2,
      body: c.noAppText,
      position: 'beforeRelated',
      ctas: [
        { label: c.startPracticingLabel, href: '/daily/word-hunt' },
        { label: c.seeEducationHubLabel, href: '/education' },
      ],
    },
    extraJsonLd: sightWordsExtraJsonLd(locale),
    enOnlyHreflang: true,
    showTeacherAccessCta: false,
    districtUpsellHideTeacherCta: false,
    breadcrumb: { home: bc.home, hub: bc.hub, current: educationPageLabel(SLUG, locale) },
    learning: {
      name: 'Sight Words Practice Online',
      educationalUse: ['Sight Word Practice', 'Reading Fluency', 'High-Frequency Word Recognition', 'Spelling Practice'],
      educationalLevel: ['Early Education', 'Primary'],
      typicalAgeRange: '4-9',
      teaches: 'Instant recognition of Dolch and Fry high-frequency sight words, spelling of high-frequency words, reading fluency foundations',
      learningResourceType: 'Game',
      educationalRole: 'student',
    },
  };
}
