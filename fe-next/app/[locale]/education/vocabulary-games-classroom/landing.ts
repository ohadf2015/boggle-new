import { educationBreadcrumbLabels, type EducationLandingContent } from '@/lib/seo/educationLanding';
import { educationPageLabel } from '@/lib/seo/educationPageLinks';
import { getVocabClassroomContent } from './content';
import { getVocabClassGames } from './classGames';
import { vocabExtraJsonLd } from './jsonLd';

const SLUG = 'vocabulary-games-classroom';

/** Carried over verbatim from the page's old inline metadata export. */
const KEYWORDS =
  'vocabulary games for classroom, classroom vocabulary games, free vocabulary games, classroom word games, vocabulary games for students, vocabulary games online free, multiplayer vocabulary game, free vocabulary game for teachers, free word games for kids classroom';

/**
 * The comparison table's column heads are product names and were never
 * translated — they are hardcoded in the page markup, and stay that way.
 */
const COMPARE_COLUMNS = ['Feature', 'LexiClash', 'Quizlet', 'Wordwall', 'Kahoot'];

/**
 * Adapter onto the shared landing shape. The copy in `content.ts` is untouched —
 * this only re-labels it for `components/education/EducationLandingTemplate`.
 * `__tests__/landingTextParity.test.tsx` diffs rendered text, link targets and
 * metadata against pre-migration snapshots.
 */
export function getVocabClassroomLanding(locale: string): EducationLandingContent {
  const c = getVocabClassroomContent(locale);
  const bc = educationBreadcrumbLabels(locale);
  return {
    accent: 'lime',
    meta: {
      title: c.metaTitle,
      description: c.metaDescription,
      ogTitle: c.ogTitle,
      ogDescription: c.ogDescription,
      twitterDescription: c.twitterDescription,
      keywords: KEYWORDS,
    },
    hero: {
      // The chip row under the CTAs; the bullet is part of the first chip's text.
      facts: [
        `● ${c.metadataLabels.languages}`,
        c.metadataLabels.gradeLevel,
        c.metadataLabels.accounts,
        c.metadataLabels.duration,
      ],
      tag: c.heroTag,
      h1: { part1: c.heroH1.line1, highlight: c.heroH1.highlight, part2: `${c.heroH1.line2}${c.heroH1.line3}` },
      subtitle: c.heroSubtitle,
      primaryCta: { label: c.ctaPrimaryButtonLabel, sublabel: c.ctaSubLabel, href: '/daily/word-hunt' },
      secondaryCta: { label: c.duelCta.label, sublabel: c.duelCta.note, href: '/education/duels' },
    },
    heroBanner: {
      title: `${c.heroH1.line1} ${c.heroH1.highlight} ${c.heroH1.line2} ${c.heroH1.line3}`,
      subtitle: c.heroSubtitle,
    },
    noAccountCopy: c.noAccount,
    sections: [
      {
        // Each point rendered behind a lime check mark; the glyph is part of the
        // visible line, so it travels with the copy.
        kind: 'prose',
        title: c.whyTitle,
        paragraphs: c.whyPoints.map((point) => `✓${point}`),
      },
      { kind: 'classgames', section: getVocabClassGames(locale) },
      { kind: 'features', title: c.sections.whatYouGet, items: c.features },
      {
        kind: 'table',
        title: c.sections.comparison,
        intro: c.sections.comparisonSubtitle,
        columns: COMPARE_COLUMNS,
        rows: c.compareRows.map((r) => [...r]),
      },
      { kind: 'cards', title: c.sections.howTeachersUse, items: c.useCases },
      {
        // The old markup numbered these with `{i + 1}`, so `steps` is right here.
        // `focus` is empty: the activity had a title and a body, never a third field.
        kind: 'steps',
        title: c.lessonPlan.heading,
        intro: c.lessonPlan.intro,
        items: c.lessonPlan.activities.map((a) => ({ step: a.title, focus: '', activity: a.body })),
      },
      {
        kind: 'playformats',
        heading: c.playFormats.heading,
        intro: c.playFormats.intro,
        liveLabel: c.playFormats.liveLabel,
        practiceLabel: c.playFormats.practiceLabel,
      },
      { kind: 'depth', sections: c.depth },
    ],
    revealSections: true,
    faqs: c.faqs,
    labels: { faqTitle: c.faqTitle, relatedTitle: c.related.label },
    related: [
      { href: '/education/esl-word-games', label: c.related.esl, accent: 'cyan' },
      { href: '/education/games-for-teachers', label: c.related.teachers, accent: 'lime' },
    ],
    footerCta: {
      heading: c.ctaHeading,
      highlight: c.ctaSubtitle,
      ctas: [
        { label: c.ctaPrimaryButtonLabel, href: '/daily/word-hunt' },
        { label: c.ctaSecondaryButtonLabel, href: '/education' },
      ],
    },
    extraJsonLd: vocabExtraJsonLd(locale, c.metaTitle, c.metaDescription),
    showTeacherAccessCta: false,
    districtUpsellHideTeacherCta: false,
    breadcrumb: { home: bc.home, hub: bc.hub, current: educationPageLabel(SLUG, locale) },
    learning: {
      educationalUse: ['Vocabulary Building', 'Classroom Activity', 'Whole-Class Multiplayer', 'Formative Assessment', 'ESL Practice'],
      educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
      typicalAgeRange: '8-99',
      teaches: 'Vocabulary, spelling, word recognition, contextual word usage',
      learningResourceType: 'Game',
      educationalRole: 'student',
    },
  };
}
