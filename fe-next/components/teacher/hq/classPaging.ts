/**
 * Paging for the Classes tab: the page never scrolls, so a teacher with more
 * classes than fit pages through them instead of scrolling a long column.
 */

/** Classes per page for the viewport: phone 1, tablet 2, desktop row 3. */
export function classPageSize(bp: { sm: boolean; lg: boolean }): number {
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
