/**
 * Shape of the Connections (Word Bridge / rosh-zanav) landing copy.
 *
 * Split out of content.ts so each locale's copy can live in its own file without
 * a circular import (locale files import these types; content.ts imports the
 * locale files). content.ts re-exports everything here, so `./content` stays the
 * single import path for consumers.
 */

export interface DemoPuzzle {
  word1: string;
  word2: string;
  bridge: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface BenefitCard {
  title: string;
  body: string;
}

export interface CompareRow {
  name: string;
  doing: string;
  length: string;
  skill: string;
}

export interface FaqEntry {
  q: string;
  a: string;
}

export interface ConnectionsLandingCopy {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  badge: string;
  h1Pre: string;
  h1Highlight: string;
  h1Sub: string;
  introP1: string;
  introP2: string;
  ctaPrimary: string;
  ctaSecondary: string;
  demo: {
    label: string;
    puzzle: DemoPuzzle;
    reveal: string;
    success: string;
  };
  samples: {
    heading: string;
    sub: string;
    revealLabel: string;
    difficultyLabels: { easy: string; medium: string; hard: string };
    items: DemoPuzzle[];
  };
  why: {
    heading: string;
    cards: BenefitCard[];
  };
  heClassic: {
    badge: string;
    title: string;
    body: string;
    imageAlt: string;
  } | null;
  compare: {
    heading: string;
    sub: string;
    columns: [string, string, string, string];
    rows: CompareRow[];
  };
  faq: {
    heading: string;
    items: FaqEntry[];
  };
  footerCta: {
    heading: string;
    body: string;
    button: string;
  };
  videoGameName: string;
  videoGameDescription: string;
}
