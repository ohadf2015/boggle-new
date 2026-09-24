/**
 * Paging for the Classes tab: the page never scrolls, so a teacher with more
 * classes than fit pages through them instead of scrolling a long column.
 */

/**
 * The media queries the Classes grid pages by. They MUST match the grid's
 * column classes (`sm:grid-cols-2 xl:grid-cols-3`). Three-up waits for xl:
 * the education sidebar is 240px wide from lg, so a 1024px screen leaves a
 * ~720px column and three cards there crushed to ~220px each.
 */
export const CLASS_GRID_QUERIES = {
  sm: '(min-width: 640px)',
  lg: '(min-width: 1280px)',
  /** A phone turned sideways: one wide card, laid out in two columns. */
  short: '(orientation: landscape) and (max-height: 500px)',
} as const;

/** Classes per page for the viewport: phone 1, tablet 2, desktop row 3, sideways phone 1. */
export function classPageSize(bp: { sm: boolean; lg: boolean; short?: boolean }): number {
  if (bp.short) return 1;
  if (bp.lg) return 3;
  if (bp.sm) return 2;
  return 1;
}

/** One page of `items`, with the page clamped into range (a class may have been deleted). */
export function pageSlice<T>(
  items: readonly T[],
  page: number,
  size: number,
): { items: T[]; page: number; pages: number } {
  const per = Math.max(1, size);
  const pages = Math.max(1, Math.ceil(items.length / per));
  const clamped = Math.min(Math.max(0, page), pages - 1);
  return { items: items.slice(clamped * per, clamped * per + per), page: clamped, pages };
}

/** The page that holds item `index` (e.g. a class the teacher just created). */
export function pageOf(index: number, size: number): number {
  if (index < 0) return 0;
  return Math.floor(index / Math.max(1, size));
}
