import { educationBreadcrumbLabels, type EducationLandingContent } from '@/lib/seo/educationLanding';
import { educationPageLabel } from '@/lib/seo/educationPageLinks';
import { getEslWordGamesContent } from './content';
import { getEslClassGames } from './classGames';
import { eslExtraJsonLd } from './jsonLd';

const SLUG = 'esl-word-games';

/** Carried over verbatim from the page's old inline metadata export. */
const KEYWORDS =
  'esl word games online, esl word games free, free esl games online, esl vocabulary games, english word games for esl students, free esl games for english learners, efl word games, esl spelling games, vocabulary games for english learners, juegos en ingles, juegos de ingles gratis, juegos para aprender ingles, juegos interactivos en ingles, juegos de palabras en ingles, juegos de vocabulario en ingles, juego de vocabulario en ingles, vocabulario en ingles juegos, juegos para aprender vocabulario en ingles';

/**
 * Adapter onto the shared landing shape. The copy in `content.ts` is untouched —
 * this only re-labels it for `components/education/EducationLandingTemplate`.
 * `__tests__/landingTextParity.test.tsx` diffs rendered text, link targets and
 * metadata against pre-migration snapshots.
 *
 * The H1 accent moves: the old markup highlighted the first phrase, the shared
 * hero highlights the middle one. The rendered characters are identical — only
 * which phrase carries the block colour changes.
 */
export function getEslWordGamesLanding(locale: string): EducationLandingContent {
  const c = getEslWordGamesContent(locale);
  const bc = educationBreadcrumbLabels(locale);
  return {
    accent: 'cyan',
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
      h1: { part1: c.heroH1.highlight, highlight: c.heroH1.rest1, part2: c.heroH1.rest2 },
      subtitle: c.heroSubtitle,
      primaryCta: { label: c.heroCtas.primary, sublabel: c.heroCtas.primaryNote, href: '/education/classroom-game' },
      secondaryCta: { label: c.heroCtas.secondary, sublabel: c.heroCtas.secondaryNote, href: '/education/duels' },
    },
    heroBanner: {
      title: `${c.heroH1.highlight} ${c.heroH1.rest1} ${c.heroH1.rest2}`,
      subtitle: c.heroSubtitle,
    },
    sections: [
      { kind: 'classgames', section: getEslClassGames(locale) },
      { kind: 'features', title: c.sections.builtFor, items: c.features },
      { kind: 'cards', title: c.sections.setLevelPerClass, items: c.proficiencyLevels },
      {
        // The old markup was an <ol> that printed no ordinal — only the `when`
        // badge — so this is `cards`, not `steps`.
        kind: 'cards',
        title: c.workflow.heading,
        intro: c.workflow.intro,
        items: c.workflow.steps.map((s) => ({ tag: s.when, title: s.what, desc: '' })),
      },
      {
        kind: 'note',
        heading: c.arcadeNote.heading,
        body: c.arcadeNote.body,
        href: c.arcadeNote.href,
        cta: c.arcadeNote.cta,
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
      { href: '/education/vocabulary-games-classroom', label: c.related.vocabulary, accent: 'lime' },
      { href: '/education/games-for-teachers', label: c.related.teachers, accent: 'cyan' },
    ],
    footerCta: {
      heading: c.sections.ctaHeading,
      highlight: c.sections.ctaSubtitle,
      ctas: [
        { label: c.sections.ctaPrimaryButtonLabel, href: '/education/classroom-game' },
        { label: c.sections.ctaSecondaryButtonLabel, href: '/education/vocabulary-games-classroom' },
      ],
    },
    extraJsonLd: eslExtraJsonLd(locale, c.metaTitle, c.metaDescription),
    showTeacherAccessCta: false,
    districtUpsellHideTeacherCta: false,
    breadcrumb: { home: bc.home, hub: bc.hub, current: educationPageLabel(SLUG, locale) },
    learning: {
      educationalUse: ['ESL Practice', 'EFL Practice', 'Vocabulary Building', 'Spelling Practice', 'Bilingual Programs'],
      educationalLevel: ['Beginner', 'Intermediate', 'Advanced', 'Adult Education'],
      typicalAgeRange: '8-99',
      teaches: 'English vocabulary, spelling, letter patterns, sight-word recognition',
      learningResourceType: 'Game',
      educationalRole: 'student',
    },
  };
}
