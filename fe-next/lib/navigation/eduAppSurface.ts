/** Classroom-product surfaces, SEO landings included: the player tab bar's Home tab would drop an edu visitor on the game home. */
const WHOLE_SECTIONS = new Set(['teacher', 'student', 'join', 'pricing', 'education']);

export function isEduAppSurface(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const segments = pathname.split('?')[0].split('#')[0].split('/').filter(Boolean);
  // Locale prefix is optional and not validated, so a new language cannot re-arm player chrome here.
  return [segments, segments.slice(1)].some(([head]) => !!head && WHOLE_SECTIONS.has(head));
}

/** The plan pages carry their own legal links; the fixed site footer pinned over their cards. */
export function isPlanPage(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const segments = pathname.split('?')[0].split('#')[0].split('/').filter(Boolean);
  return [segments, segments.slice(1)].some(
    (tail) => (tail[0] === 'pricing' && tail.length === 1) || (tail[0] === 'teacher' && tail[1] === 'upgrade' && tail.length === 2),
  );
}
