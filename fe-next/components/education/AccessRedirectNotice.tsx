'use client';
import { Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Explains WHY a teacher landed on the access page.
 *
 * `TeacherGate` already encodes the blocked destination as `?from=`, but the
 * access page used to drop it: the teacher was silently `router.replace`d off
 * the page they clicked and onto a generic "apply for access" pitch, with
 * nothing tying the two together. A real es-PE teacher (LogRocket, 2026-08-31)
 * bounced classroom-game → access three times before filling in the form that
 * had been in front of them the whole time.
 */

// Reuse the breadcrumb labels rather than minting a second set of destination
// names — these are already translated in every locale, and a second set would
// drift from the first.
const BREADCRUMB_KEYS = new Set([
  'analytics',
  'classroomGame',
  'classrooms',
  'curriculum',
  'duels',
  'lessons',
  'profile',
  'reports',
  'teacher',
]);

/**
 * Resolves a redirect path to an existing breadcrumb translation key, or null
 * when we have no real label for it — callers must fall back to a generic
 * phrase. Returning a guessed key path would render the key itself to the user.
 */
export function accessRedirectDestKey(from: string | null | undefined): string | null {
  if (!from) return null;
  const segments = from.split('?')[0].split('/').filter(Boolean);
  // Walk from the most specific segment back, so /teacher/curriculum resolves to
  // "Curriculum" and not to "Teacher".
  for (let i = segments.length - 1; i >= 0; i--) {
    const camel = segments[i].replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    if (BREADCRUMB_KEYS.has(camel)) return `education.header.breadcrumbs.${camel}`;
  }
  return null;
}

export function AccessRedirectNotice({ from }: { from?: string | null }) {
  const { t } = useLanguage();
  if (!from) return null;

  const destKey = accessRedirectDestKey(from);
  const dest = t(destKey ?? 'education.access.redirect_dest_fallback');

  return (
    <div className="mb-3 flex justify-center">
      <p
        role="status"
        className="inline-flex max-w-full items-center gap-1.5 rounded-full border-2 border-neo-cyan/60 bg-neo-cyan/10 px-3 py-1 text-sm font-bold text-neo-cyan"
      >
        <Info aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="min-w-0">{t('education.access.redirect_chip', { dest })}</span>
      </p>
    </div>
  );
}
