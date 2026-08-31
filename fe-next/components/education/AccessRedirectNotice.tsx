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
    <div
      role="status"
      className="mb-5 flex items-start gap-3 rounded-neo border-neo-thick border-black bg-neo-cyan p-4 text-neo-navy shadow-hard"
    >
      <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-neo-display text-base font-black tracking-[-0.01em]">
          {t('education.access.redirect_title')}
        </p>
        <p className="mt-1 text-sm font-semibold text-neo-navy/85">
          {t('education.access.redirect_body', { dest })}
        </p>
      </div>
    </div>
  );
}
