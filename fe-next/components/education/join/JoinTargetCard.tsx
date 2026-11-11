'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { JoinTarget } from './joinTarget';

const K = 'education.student.join';

/** Whose code this is. A live game always gets the card, named for the class or not at all. */
export function JoinTargetCard({ target }: { target: JoinTarget }) {
  const { t } = useLanguage();
  const live = target.verdict === 'game';
  if (!live && !target.label) return null;
  return (
    <div
      data-testid="join-target-card"
      data-live={live ? 'true' : 'false'}
      className={cn(
        'rounded-neo border-3 p-3 shadow-hard',
        live ? 'border-neo-black bg-neo-pink text-neo-black' : 'border-neo-lime bg-neo-navy-light text-neo-cream'
      )}
    >
      <p className={cn('flex items-center gap-2 font-neo-display text-xs font-black uppercase tracking-wide', live ? 'text-neo-black' : 'text-neo-lime')}>
        {live && (
          <span aria-hidden="true" className="relative flex size-2.5">
            <span className="absolute inline-flex size-full rounded-full bg-neo-white motion-safe:animate-ping" />
            <span className="relative inline-flex size-2.5 rounded-full bg-neo-white" />
          </span>
        )}
        {t(live ? `${K}.preview.gameLabel` : `${K}.preview.label`)}
      </p>
      {target.label && (
        <p dir="auto" title={target.label} className="truncate font-neo-display text-xl font-black leading-tight lg:text-2xl">
          {target.label}
        </p>
      )}
      <p className={cn('mt-1 line-clamp-2 font-neo-body text-sm font-bold leading-snug', live ? 'text-neo-black/85' : 'text-neo-cream/80')}>
        {t(live ? `${K}.preview.gameConfirm` : `${K}.preview.classroomNext`)}
      </p>
    </div>
  );
}
