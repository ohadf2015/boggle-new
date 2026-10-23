/** Classroom-product surfaces, SEO landings included: the player tab bar's Home tab would drop an edu visitor on the game home. */
const WHOLE_SECTIONS = new Set(['teacher', 'student', 'join', 'pricing', 'education']);

export function isEduAppSurface(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const segments = pathname.split('?')[0].split('#')[0].split('/').filter(Boolean);
  // Locale prefix is optional and not validated, so a new language cannot re-arm player chrome here.
  return [segments, segments.slice(1)].some(([head]) => !!head && WHOLE_SECTIONS.has(head));
}

/** The consumer site footer links to blog, FAQ and contact pages; on an edu surface those are exits out of the product. */
export function hidesSiteFooter(pathname: string | null | undefined): boolean {
  return isEduAppSurface(pathname);
}

// SiteFooter still imports the old name.
export const isPlanPage = hidesSiteFooter;
