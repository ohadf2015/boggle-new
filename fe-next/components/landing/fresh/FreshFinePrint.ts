/**
 * The one fine-print register left on the homepage (homepage gauntlet): the
 * sentence carrying the editorial links at the foot of the FAQ card
 * (FreshReadMore). Since round 6 the How to Play section, the blog list and
 * the FAQ card itself are set at section scale in the page's own language
 * (tiles, cards, the mascot), not as fine print; only this one sentence stays
 * quiet. Literal class strings (Tailwind v4).
 */
export const FINE_BODY = 'font-neo-body text-sm leading-relaxed text-neo-cream/85 md:text-base';

export const FINE_LINK =
  'font-neo-body text-sm font-bold text-neo-cream underline decoration-neo-cream/40 decoration-2 underline-offset-4 transition-colors hover:text-neo-cyan hover:decoration-neo-cyan focus-visible:rounded-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan md:text-base';
