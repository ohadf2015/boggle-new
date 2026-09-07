import { educationBreadcrumbLabels, type EducationLandingContent } from '@/lib/seo/educationLanding';
import { getSpellingBeeContent } from './content';
import { spellingBeeExtraJsonLd } from './jsonLd';
import { educationPageLabel } from '@/lib/seo/educationPageLinks';

const SLUG = 'spelling-bee-practice';

/** Carried over verbatim from the page's old inline metadata export. */
const KEYWORDS =
  'spelling bee practice online, online spelling bee practice, spelling bee training, spelling games online, spelling practice free, scripps spelling bee practice, classroom spelling bee, spelling games for kids, spelling bee online, spelling competition practice';

/** Each drill-mode card links to the practice mode it names. Order matters. */
const DRILL_HREFS = ['/practice/wordHunt', '/practice/wheelRush', '/practice/classic', '/education/duels'];
/**
 * Adapter onto the shared landing shape. The copy above is untouched — this
 * only re-labels it for `components/education/EducationLandingTemplate`, so no
 * string is retyped and none can drift. `__tests__/landingTextParity.test.tsx`
 * diffs rendered text, link targets and metadata against pre-migration
 * snapshots.
 */
export function getSpellingBeeLanding(locale: string): EducationLandingContent {
  const c = getSpellingBeeContent(locale);
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
      primaryCta: { label: c.startWordHuntLabel, sublabel: c.freeLabel, href: '/practice/wordHunt' },
      secondaryCta: { label: c.duelLabel, sublabel: c.pairWithCompetitorLabel, href: '/education/duels' },
    },
    heroBanner: { title: c.heroTitle, subtitle: c.heroSubtitle },
    sections: [
      {
        kind: 'cards',
        title: c.drillModesHeading,
        items: c.drillModes.map((m, i) => ({
          title: m.title,
          desc: m.desc,
          href: DRILL_HREFS[i],
          cta: c.practiceNowLabel,
        })),
      },
      {
        // `cards`, not `steps`: the steps rail prints an ordinal before each row
        // and this plan never showed one. The week badge is the only marker.
        kind: 'cards',
        title: c.trainingPlanHeading,
        intro: c.trainingPlanIntro,
        items: c.trainingPlanItems.map((p) => ({ tag: p.week, title: p.focus, desc: p.activity })),
      },
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
        { label: c.startDrillingLabel, href: '/practice/wordHunt' },
        { label: c.seeEducationHubLabel, href: '/education' },
      ],
    },
    extraJsonLd: spellingBeeExtraJsonLd(locale),
    showTeacherAccessCta: false,
    districtUpsellHideTeacherCta: false,
    breadcrumb: { home: bc.home, hub: bc.hub, current: educationPageLabel(SLUG, locale) },
    learning: {
      educationalUse: ['Spelling Practice', 'Spelling Bee Preparation', 'Vocabulary Building', 'Pattern Recognition', 'Competition Training'],
      educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
      typicalAgeRange: '7-18',
      teaches: 'Spelling, letter pattern recognition, word recall under time pressure, vocabulary',
      learningResourceType: 'Game',
      educationalRole: 'student',
    },
  };
}
