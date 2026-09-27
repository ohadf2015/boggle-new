import { educationBreadcrumbLabels, type EducationLandingContent } from '@/lib/seo/educationLanding';
import { getGamesForTeachersContent } from './content';
import { educationPageLabel } from '@/lib/seo/educationPageLinks';

const SLUG = 'games-for-teachers';

/** Carried over verbatim from the page's old inline metadata export. */
const KEYWORDS =
  'word games for teachers, vocabulary games for teachers, classroom games for teachers, teacher word games, free games for teachers, classroom activities for teachers, no-prep classroom games, sub day word games, brain break word games, teacher vocabulary tools';
/**
 * Adapter onto the shared landing shape.
 *
 * The copy above stays exactly where it was written — this only re-labels it
 * for `components/education/EducationLandingTemplate`, so no string is retyped
 * and none can drift. `__tests__/landingTextParity.test.tsx` diffs the rendered
 * text, the link targets and the metadata export against snapshots taken from
 * the pre-migration page.
 */
export function getGamesForTeachersLanding(locale: string): EducationLandingContent {
  const c = getGamesForTeachersContent(locale);
  const bc = educationBreadcrumbLabels(locale);
  return {
    accent: 'purple',
    meta: {
      title: c.metaTitle,
      description: c.metaDescription,
      ogTitle: c.ogTitle,
      ogDescription: c.ogDescription,
      twitterDescription: c.twitterDescription,
      keywords: KEYWORDS,
    },
    hero: {
      facts: [],
      tag: c.heroTag,
      h1: c.heroH1,
      subtitle: c.heroSubtitle,
      primaryCta: { label: c.heroCtaStartGame, sublabel: c.ctaSubLabel, href: '/education/classroom-game' },
      secondaryCta: { label: c.heroCtaTeacherHub, sublabel: c.heroCtaTeacherHubSub, href: '/education' },
    },
    heroBanner: {
      title: `${c.heroH1.part1} ${c.heroH1.highlight} ${c.heroH1.part2}`,
      subtitle: c.heroSubtitle,
    },
    sections: [
      { kind: 'features', title: c.whatYouGetTitle, items: c.features },
      { kind: 'cards', title: c.sections.howYouUse, items: c.useCases },
    ],
    revealSections: true,
    faqs: c.faqs,
    labels: { faqTitle: c.faqTitle, relatedTitle: c.relatedResourcesAriaLabel },
    related: [
      { href: '/education/vocabulary-games-classroom', label: c.relatedVocabLink, accent: 'lime' },
      { href: '/education/esl-word-games', label: c.relatedEslLink, accent: 'cyan' },
      { href: '/education/for-schools', label: c.relatedForSchoolsLink, accent: 'pink' },
    ],
    footerCta: {
      heading: c.sections.ctaHeading,
      highlight: c.sections.ctaSubtitle,
      ctas: [
        { label: c.sections.ctaPrimaryButtonLabel, href: '/education/classroom-game' },
        { label: c.sections.ctaSecondaryButtonLabel, href: '/education/vocabulary-games-classroom' },
      ],
    },
    breadcrumb: { home: bc.home, hub: bc.hub, current: educationPageLabel(SLUG, locale) },
    learning: {
      educationalUse: ['Classroom Activity', 'Formative Assessment', 'Vocabulary Building', 'Brain Break', 'Substitute Teacher Activity'],
      educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
      typicalAgeRange: '8-99',
      teaches: 'Vocabulary, spelling, word recognition, contextual usage',
    },
  };
}
