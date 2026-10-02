'use client';

import { useEffect } from 'react';
import { ClipboardList } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackEduFirstAssignmentCtaClicked, trackEduFirstAssignmentCtaShown } from '@/lib/education/telemetry';

/** Phone-only twin of FirstAssignmentPanel's CTA, so the nudge costs no extra row on a 390px deck. */
export function FirstAssignmentInlineCta({ classroomId, onCta }: { classroomId: string; onCta: () => void }) {
  const { t } = useLanguage();
  useEffect(() => {
    trackEduFirstAssignmentCtaShown({ classroomId });
  }, [classroomId]);
  return (
    <button
      type="button"
      data-testid="hq-first-assignment-inline"
      onClick={() => {
        trackEduFirstAssignmentCtaClicked({ classroomId });
        onCta();
      }}
      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-neo border-2 border-neo-lime bg-neo-navy px-2.5 font-neo-display text-xs font-bold text-neo-lime shadow-hard-sm transition-[box-shadow,background-color] duration-100 hover:bg-neo-lime/10 active:shadow-none focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan sm:hidden"
    >
      <ClipboardList className="size-4 shrink-0" strokeWidth={2.75} aria-hidden="true" />
      {t('eduHq.hq.assignNudge')}
    </button>
  );
}

export default FirstAssignmentInlineCta;
