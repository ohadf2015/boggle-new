import { educationBreadcrumbLabels, type EducationAccent, type EducationLandingContent } from '@/lib/seo/educationLanding';
import { educationPageLabel } from '@/lib/seo/educationPageLinks';
import type { ClassGameSection } from '@/components/education/ClassGameList';
import type { LocaleContent } from './types';

type Node = Record<string, unknown> & { '@type': string };

type CtaTarget = { primary: string; secondary: string; footerSecondary: string };

type RelatedLink = { href: string; labelKey: 'vocabulary' | 'teachers' | 'hub'; accent: EducationAccent };

export function buildEnglishLearnerLanding(opts: {
  locale: string;
  slug: string;
  accent: EducationAccent;
  keywords: string;
  content: LocaleContent;
  classGames: ClassGameSection;
  extraJsonLd: Node[];
  ctas: CtaTarget;
  related: RelatedLink[];
  learning: EducationLandingContent['learning'];
}): EducationLandingContent {
  const { locale, slug, accent, keywords, content: c, classGames, extraJsonLd, ctas, related, learning } = opts;
  const bc = educationBreadcrumbLabels(locale);
  const sections: EducationLandingContent['sections'] = [
    { kind: 'classgames', section: classGames },
    { kind: 'features', title: c.sections.builtFor, items: c.features },
    { kind: 'cards', title: c.sections.setLevelPerClass, items: c.proficiencyLevels },
    {
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
  ];
  if (c.topics) {
    sections.splice(1, 0, {
      kind: 'wordlist',
      title: c.topics.title,
      intro: c.topics.intro,
      groups: c.topics.groups,
    });
  }
  return {
    accent,
    meta: {
      title: c.metaTitle,
      description: c.metaDescription,
      ogTitle: c.ogTitle,
      ogDescription: c.ogDescription,
      twitterDescription: c.twitterDescription,
      keywords,
    },
    hero: {
      facts: [],
      tag: c.heroTag,
      h1: { part1: c.heroH1.highlight, highlight: c.heroH1.rest1, part2: c.heroH1.rest2 },
      subtitle: c.heroSubtitle,
      primaryCta: { label: c.heroCtas.primary, sublabel: c.heroCtas.primaryNote, href: ctas.primary },
      secondaryCta: { label: c.heroCtas.secondary, sublabel: c.heroCtas.secondaryNote, href: ctas.secondary },
    },
    heroBanner: {
      title: `${c.heroH1.highlight} ${c.heroH1.rest1} ${c.heroH1.rest2}`,
      subtitle: c.heroSubtitle,
    },
    sections,
    revealSections: true,
    faqs: c.faqs,
    labels: { faqTitle: c.faqTitle, relatedTitle: c.related.label },
    related: related.map((r) => ({ href: r.href, label: c.related[r.labelKey], accent: r.accent })),
    footerCta: {
      heading: c.sections.ctaHeading,
      highlight: c.sections.ctaSubtitle,
      ctas: [
        { label: c.sections.ctaPrimaryButtonLabel, href: ctas.primary },
        { label: c.sections.ctaSecondaryButtonLabel, href: ctas.footerSecondary },
      ],
    },
    extraJsonLd,
    showTeacherAccessCta: false,
    districtUpsellHideTeacherCta: false,
    breadcrumb: { home: bc.home, hub: bc.hub, current: educationPageLabel(slug, locale) },
    learning,
  };
}
