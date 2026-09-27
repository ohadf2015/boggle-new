import type { DepthSection } from '@/components/education/EducationDepthSections';

export type LocaleContent = {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  twitterDescription: string;
  heroTag: string;
  heroH1: { highlight: string; rest1: string; rest2: string };
  heroSubtitle: string;
  ctaLabel: string;
  heroCtas: {
    primary: string;
    primaryNote: string;
    secondary: string;
    secondaryNote: string;
  };
  related: {
    label: string;
    vocabulary: string;
    teachers: string;
    hub: string;
  };
  depth: DepthSection[];
  playFormats: {
    heading: string;
    intro: string;
    liveLabel: string;
    practiceLabel: string;
  };
  workflow: {
    heading: string;
    intro: string;
    steps: Array<{ when: string; what: string }>;
  };
  arcadeNote: { heading: string; body: string; href: string; cta: string };
  faqTitle: string;
  faqs: Array<{ q: string; a: string }>;
  features: Array<{ icon: string; text: string }>;
  proficiencyLevels: Array<{ tag: string; title: string; desc: string }>;
  sections: {
    builtFor: string;
    setLevelPerClass: string;
    ctaHeading: string;
    ctaSubtitle: string;
    ctaPrimaryButtonLabel: string;
    ctaSecondaryButtonLabel: string;
  };
  topics?: {
    title: string;
    intro: string;
    groups: Array<{ label: string; words: string[] }>;
  };
};

export const EDUCATION_LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;
export type EducationLocale = (typeof EDUCATION_LOCALES)[number];
