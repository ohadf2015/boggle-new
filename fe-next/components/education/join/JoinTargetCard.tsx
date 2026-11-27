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
      className="edu-card overflow-hidden"
    >
      <p
        data-testid="join-target-band"
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 font-neo-display text-xs font-black uppercase tracking-wide',
          live ? 'border-b-3 border-neo-black bg-neo-pink text-neo-black' : 'text-edu-lime-ink'
        )}
      >
        {live && (
          <span aria-hidden="true" className="relative flex size-2.5">
            <span className="absolute inline-flex size-full rounded-full bg-edu-paper motion-safe:animate-ping" />
            <span className="relative inline-flex size-2.5 rounded-full bg-edu-paper ring-2 ring-neo-black" />
          </span>
        )}
        {t(live ? `${K}.preview.gameLabel` : `${K}.preview.label`)}
      </p>
      <div className="px-3 pb-3 pt-1.5">
        {target.label && (
          <p dir="auto" title={target.label} className="truncate font-neo-display text-2xl font-black leading-tight text-edu-ink lg:text-3xl">
            {target.label}
          </p>
        )}
        <p className="mt-1 line-clamp-2 font-neo-body text-sm font-bold leading-snug text-edu-ink/80">
          {t(live ? `${K}.preview.gameConfirm` : `${K}.preview.classroomNext`)}
        </p>
      </div>
    </div>
  );
}
