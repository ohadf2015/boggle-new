'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { TeacherOnboarding } from '@/components/education/TeacherOnboarding';

/** The header "?": reachable from every teacher screen, opens the compact how-it-works. */
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
          'bg-neo-navy-light text-neo-cream',
          'border-2 border-neo-cream/40',
          'rounded-neo shadow-hard-sm',
          'hover:-translate-y-px hover:bg-neo-cyan hover:text-neo-black hover:shadow-hard',
          'active:translate-y-px active:shadow-none',
          'transition duration-100',
          'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2',
        )}
      >
        <HelpCircle className="h-5 w-5" aria-hidden="true" />
      </button>
      {open ? <TeacherOnboarding open onDismiss={() => setOpen(false)} /> : null}
    </>
  );
}

export default TeacherHelpButton;
