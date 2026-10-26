/**
 * Sizing for the Classes carousel: the page never scrolls vertically, so a
 * teacher with more classes than fit swipes through them sideways.
 */

/**
 * The media queries the Classes carousel sizes by. They MUST match the carousel's
 * per-view widths (2 from sm, 3 from xl). Three-up waits for xl:
 * the education sidebar is 240px wide from lg, so a 1024px screen leaves a
 * ~720px column and three cards there crushed to ~220px each.
 */
export const CLASS_GRID_QUERIES = {
  sm: '(min-width: 640px)',
  lg: '(min-width: 1280px)',
  /** A phone turned sideways: one wide card, laid out in two columns. */
  short: '(orientation: landscape) and (max-height: 500px)',
} as const;

/** Classes in view for the viewport: phone 1, tablet 2, desktop row 3, sideways phone 1. */
export function classPageSize(bp: { sm: boolean; lg: boolean; short?: boolean }): number {
  if (bp.short) return 1;
  if (bp.lg) return 3;
  if (bp.sm) return 2;
  return 1;
}

/** How many snap stops the carousel has: one per screenful of cards. */
export function carouselPages(count: number, perView: number): number {
  return Math.max(1, Math.ceil(count / Math.max(1, perView)));
}

/**
 * The page the scroller is on. `firstIndex` is the card nearest the start
 * edge. A scroller clamped at its end can leave that card mid-page (5 cards,
 * 2 per view: card 3 is the furthest it gets), so the end always means the
 * last page.
 */
export function carouselPage(o: { firstIndex: number; atEnd: boolean; perView: number; count: number }): number {
  const pages = carouselPages(o.count, o.perView);
  if (o.atEnd) return pages - 1;
  const page = Math.round(o.firstIndex / Math.max(1, o.perView));
  return Math.min(Math.max(0, page), pages - 1);
}
