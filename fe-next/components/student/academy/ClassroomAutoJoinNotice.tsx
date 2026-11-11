'use client';

import { useLanguage } from '@/contexts/LanguageContext';

/** Sits above the live-game button while the class page counts down to joining. */
export function ClassroomAutoJoinNotice({ onStay }: { onStay: () => void }) {
  const { t } = useLanguage();
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="classroom-auto-join-notice"
      className="pointer-events-auto flex items-center justify-between gap-3 rounded-neo border-3 border-neo-black bg-neo-lime px-3 py-2 text-neo-navy shadow-hard-sm"
    >
      <span className="min-w-0 font-neo-display text-base font-black leading-tight">{t('academy.student.autoJoin.title')}</span>
      <button
        type="button"
        onClick={onStay}
        className="min-h-11 shrink-0 rounded-neo border-3 border-neo-black bg-neo-cream px-3 font-neo-display text-sm font-black uppercase text-neo-navy focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan"
      >
        {t('academy.student.autoJoin.stay')}
      </button>
    </div>
  );
}

export default ClassroomAutoJoinNotice;
