/**
 * Text of a standard `lexiclash-vs-*` comparison page (see VsComparisonPage).
 * Each page keeps one `copy.ts` holding this shape for all six locales.
 */
import type { VsCommonCopy } from './vsCommonCopy';

export interface VsPageCopy extends VsCommonCopy {
  h1: string;
  intro: string;
  /** Labels of the 2nd and 3rd buttons under the intro (the 1st is `ctaTry`). */
  cta2: string;
  cta3: string;
  rows: ReadonlyArray<readonly [string, string, string]>;
  pricingNote: string;
  beatsTitle: string;
  beats: ReadonlyArray<{ title: string; desc: string }>;
  winsTitle: string;
  wins: string;
  faqs: ReadonlyArray<{ q: string; a: string }>;
  moreComparisons: ReadonlyArray<{ title: string; desc: string }>;
  tryTitle: string;
  tryBody: string;
  tryCta: string;
  breadcrumbPage: string;
}
