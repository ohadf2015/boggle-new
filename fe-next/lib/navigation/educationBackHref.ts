/**
 * Where the education header's back button goes when the page names no target.
 *
 * The old default was always `/{locale}/education`. That landing `replace()`s a
 * teacher to classroom-game and a student to `/student`, so "back" from
 * classroom-game looped onto itself and a student's subpage landed on
 * marketing. Teacher/student subpages return to their own hub; anything else
 * goes to the hub the landing would have sent this viewer to anyway.
 */
import { locales as LOCALES } from '@/lib/i18n';

export type EducationRole = 'teacher' | 'student' | null;

export function educationHomeFor(locale: string, role: EducationRole): string {
  if (role === 'teacher') return `/${locale}/teacher`;
  if (role === 'student') return `/${locale}/student`;
  return `/${locale}/education`;
}

export interface EducationBackHrefParams {
  pathname: string | null | undefined;
  locale: string;
  role: EducationRole;
}

export function educationBackHref({ pathname, locale, role }: EducationBackHrefParams): string {
  const segs = (pathname || '').split('?')[0].split('#')[0].split('/').filter(Boolean);
  const rest = segs.length > 0 && LOCALES.includes(segs[0]) ? segs.slice(1) : segs;
  const [section, sub] = rest;

  if (section === 'teacher' && sub) return `/${locale}/teacher`;
  // `/student` sends a signed-out visitor straight back to `/student/join`.
  if (section === 'student' && sub === 'join') return `/${locale}/education`;
  if (section === 'student' && sub) return `/${locale}/student`;
  return educationHomeFor(locale, role);
}
