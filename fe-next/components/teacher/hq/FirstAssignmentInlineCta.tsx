'use client';

import { ClipboardList } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackEduFirstAssignmentCtaClicked } from '@/lib/education/telemetry';

/** Phone-only twin of FirstAssignmentPanel's CTA, so the nudge costs no extra row on a 390px deck. */
export function FirstAssignmentInlineCta({ classroomId, onCta }: { classroomId: string; onCta: () => void }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      data-testid="hq-first-assignment-inline"
      onClick={() => {
        trackEduFirstAssignmentCtaClicked({ classroomId });
        onCta();
      }}
      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-neo border-2 border-black bg-neo-lime px-2.5 font-neo-display text-[0.7rem] font-black uppercase tracking-wide text-black shadow-hard-sm transition-[box-shadow] duration-100 active:shadow-none focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan sm:hidden"
    >
      <ClipboardList className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
      {t('academy.hq.firstAssignmentCta', 'Create assignment')}
    </button>
  );
}

export default FirstAssignmentInlineCta;
