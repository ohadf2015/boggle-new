'use client';

import { Lock, RotateCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/** The teacher closed the door: nothing to fix here, only wait for them and try again. */
export function JoinRoomLocked({ onRetry, busy }: { onRetry: () => void; busy: boolean }) {
  const { t } = useLanguage();
  return (
    <div
      role="alert"
      data-testid="join-room-locked"
      className="flex flex-col gap-3 rounded-neo border-3 border-neo-black bg-neo-yellow p-3 text-neo-black shadow-hard"
    >
      <p className="flex items-start gap-2 font-neo-display text-lg font-black leading-tight lg:text-xl">
        <Lock aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={2.75} />
        <span>{t('education.student.join.roomLocked.title')}</span>
      </p>
      <p className="font-neo-body text-sm font-bold leading-snug lg:text-base">{t('education.student.join.roomLocked.hint')}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-neo border-3 border-neo-cream bg-neo-navy px-4 py-2 font-neo-display text-sm font-black uppercase text-neo-lime shadow-hard-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan disabled:opacity-60"
      >
        <RotateCw aria-hidden="true" className="size-4" strokeWidth={2.75} />
        {t('education.student.join.roomLocked.retry')}
      </button>
    </div>
  );
}

export default JoinRoomLocked;
