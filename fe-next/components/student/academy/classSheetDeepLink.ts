/**
 * Deep link into the class view: `/${locale}/student?class=open`.
 *
 * A student who just joined a classroom (invite auto-join or the roster flow)
 * lands on the Academy hub with ClassSheet already open, its next-open-
 * assignment CTA in reach. Pure and tiny so the URL contract stays pinned by
 * a fast node test — AcademyHub only wires it to useSearchParams + state.
 */

/** Minimal read-only slice of next/navigation's ReadonlyURLSearchParams. */
export interface ClassSheetSearchParams {
  get(name: string): string | null;
}

/**
 * ClassSheet opens only when the link asked for it AND the student actually
 * has a classroom — a signed-in solo student opening `?class=open` manually
 * must not get an empty sheet.
 */
export function shouldOpenClassSheet(
  searchParams: ClassSheetSearchParams | null | undefined,
  classroomId: string | null | undefined
): boolean {
  return !!classroomId && searchParams?.get('class') === 'open';
}
