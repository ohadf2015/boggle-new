'use client';

/**
 * TeacherHelpButton — the "?" control in the education header.
 *
 * `TeacherOnboarding` has documented this button since it shipped ("Reopenable
 * from the teacher dashboard '?' button (forceShow)") and its `forceShow` prop
 * is implemented and covered by a test — but the trigger itself was never
 * built. The practical effect: the walkthrough is first-run only, and a teacher
 * who dismissed it had no way back to the setup instructions from anywhere in
 * the product.
 *
 * Lives in the header rather than the dashboard body for two reasons: it is
 * then reachable from every teacher screen (classes, lessons, reports), and
 * `TeacherDashboard` is at 498 of its 500-line cap. Mirrors the sibling
 * `TeacherWhatsNew` button next to it.
 *
 * Its label, `education.onboarding.showTutorial` ("How it works"), was already
 * translated into all six locales and referenced by a dashboard test mock, but
 * rendered by no component — the string shipped, the control never did.
 */

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { TeacherOnboarding } from '@/components/education/TeacherOnboarding';

export function TeacherHelpButton() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        data-testid="teacher-help-button"
        onClick={() => setOpen(true)}
        aria-label={t('education.onboarding.showTutorial')}
        className={cn(
          'flex items-center justify-center shrink-0',
          'h-10 w-10 min-w-[40px] min-h-[40px]',
          'bg-neo-cream text-neo-black dark:bg-neo-navy dark:text-neo-white',
          'border-3 border-neo-black dark:border-neo-cream',
          'rounded-neo shadow-hard-sm',
          'hover:-translate-y-px hover:bg-neo-cyan hover:text-neo-black hover:shadow-hard',
          'active:translate-y-px active:shadow-none',
          'transition-all duration-100',
          'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2',
        )}
      >
        <HelpCircle className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* `forceShow` is what makes this work at all: the teacher who needs the
          button most is by definition one who already dismissed (and so
          persisted) the walkthrough. Unmounting on dismiss keeps the button a
          toggle rather than a one-shot. */}
      {open && <TeacherOnboarding forceShow onDismiss={() => setOpen(false)} />}
    </>
  );
}

export default TeacherHelpButton;
