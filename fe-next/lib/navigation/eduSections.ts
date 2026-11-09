/**
 * The education product's top-level sections. Every education/game split (site
 * chrome, ads, install prompts, error homes) reads this list; each check adds its own
 * exceptions next to its import. A new edu folder goes here, or the guard test fails.
 */
export const EDU_SECTIONS = ['teacher', 'student', 'join', 'education', 'classroom', 'report', 'pricing'] as const;
export type EduSection = (typeof EDU_SECTIONS)[number];

const SECTION_SET: ReadonlySet<string> = new Set(EDU_SECTIONS);
const LOCALE_RE = /^[a-z]{2}$/;

export function eduSectionOf(pathname: string | null | undefined): EduSection | null {
  const segs = (pathname || '').split('?')[0].split('#')[0].split('/').filter(Boolean);
  const head = segs[0] && LOCALE_RE.test(segs[0]) ? segs[1] : segs[0];
  return head && SECTION_SET.has(head) ? (head as EduSection) : null;
}

export type ProductSurface = 'edu' | 'game';

/** Which product a page belongs to; analytics, pixels and session replay all split on this. */
export function surfaceOf(pathname: string | null | undefined): ProductSurface {
  return eduSectionOf(pathname) ? 'edu' : 'game';
}
