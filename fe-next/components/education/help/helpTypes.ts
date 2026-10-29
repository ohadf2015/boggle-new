import type { HelpShotId } from './shots';

export const HELP_LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;
export type HelpLocale = (typeof HELP_LOCALES)[number];

export function isHelpLocale(locale: string): locale is HelpLocale {
  return (HELP_LOCALES as readonly string[]).includes(locale);
}

/** App locales with no translated help yet: they get the English article plus a note, never a 404. */
export const HELP_FALLBACK_LOCALES = ['ru'] as const;

export function servesHelp(locale: string): boolean {
  return isHelpLocale(locale) || (HELP_FALLBACK_LOCALES as readonly string[]).includes(locale);
}

export const HELP_CATEGORY_IDS = [
  'gettingStarted',
  'liveGame',
  'assign',
  'reports',
  'wordLists',
  'privacy',
  'billing',
] as const;
export type HelpCategoryId = (typeof HELP_CATEGORY_IDS)[number];

export type HelpNextStepId = 'startClass' | 'liveGame' | 'upgrade' | 'schools';

export interface HelpArticleMeta {
  slug: string;
  category: HelpCategoryId;
  kind: 'article' | 'tutorial';
  minutes: number;
  next: HelpNextStepId;
  related: string[];
  /** Emit HowTo JSON-LD: only for articles whose body is an ordered procedure. */
  howTo: boolean;
}

export interface HelpStep {
  title: string;
  body?: string;
  shot?: HelpShotId;
  /** Tutorials only: the clock label for this step, e.g. "0:00". */
  time?: string;
}

export type HelpBlock =
  | { t: 'p'; text: string }
  | { t: 'h2'; text: string }
  | { t: 'steps'; items: HelpStep[] }
  | { t: 'tip'; text: string }
  | { t: 'pro'; text: string }
  | { t: 'shot'; id: HelpShotId; caption: string }
  | { t: 'list'; items: string[] };

export interface HelpArticleText {
  title: string;
  summary: string;
  /** Extra words people type when they search for this, comma-separated. */
  keywords: string;
  blocks: HelpBlock[];
}

export type HelpLocaleContent = Record<string, HelpArticleText>;

export interface HelpQuickAnswer {
  q: string;
  a: string;
  slug: string;
}
