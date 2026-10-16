/** Classroom-product surfaces with their own chrome; the player bottom nav and floating widgets stay off them. */
const WHOLE_SECTIONS = new Set(['teacher', 'student', 'join', 'pricing']);
const EDUCATION_APP_PAGES = new Set(['access', 'live', 'classroom-game', 'lists']);

export function isEduAppSurface(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const segments = pathname.split('?')[0].split('#')[0].split('/').filter(Boolean);
  // Locale prefix is optional and not validated, so a new language cannot re-arm player chrome here.
  return [segments, segments.slice(1)].some((tail) => {
    const [head, sub] = tail;
    if (!head) return false;
    if (WHOLE_SECTIONS.has(head)) return true;
    if (head !== 'education') return false;
    return sub === undefined || EDUCATION_APP_PAGES.has(sub);
  });
}

/** The plan pages carry their own legal links; the fixed site footer pinned over their cards. */
export function isPlanPage(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const segments = pathname.split('?')[0].split('#')[0].split('/').filter(Boolean);
  return [segments, segments.slice(1)].some(
    (tail) => (tail[0] === 'pricing' && tail.length === 1) || (tail[0] === 'teacher' && tail[1] === 'upgrade' && tail.length === 2),
  );
}
