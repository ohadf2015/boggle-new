/**
 * Text of a "honesty foil" comparison page (see VsFoilPage): one competitor's
 * published free-plan limits against LexiClash's single free class cap.
 */
export interface VsFoilCopy {
  eyebrow: string;
  h1: string;
  /** Plain text with `**bold**` and `[label](https://url)` markers. */
  lede: string;
  sideHeading: string;
  thFeature: string;
  thCompetitor: string;
  rows: ReadonlyArray<readonly [string, string, string]>;
  /** Empty hides the paragraph under the table. */
  footnote: string;
  faqHeading: string;
  faqs: ReadonlyArray<{ q: string; a: string }>;
  ctaStart: string;
  /** Labels of the related-comparison links, in the order of `relatedHrefs`. */
  related: ReadonlyArray<{ label: string }>;
}
