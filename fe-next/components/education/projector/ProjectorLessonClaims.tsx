'use client';

import { memo } from 'react';
import { m } from 'framer-motion';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Pop } from '@/components/education/motion/Pop';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';
import { useLessonClaims } from '@/components/education/live/useLessonClaims';
import type { LessonClaimSlot } from '@/shared/types/lessonClaims';

export interface ProjectorLessonClaimsProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  className?: string;
}

/**
 * The class's shared race board: each placed lesson word as a masked tile that flips to the word and
 * its claimer. Sized by its own box (container units), so it holds under the TV stage zoom.
 */
export const ProjectorLessonClaims = memo(function ProjectorLessonClaims({ t, className }: ProjectorLessonClaimsProps) {
  const race = useLessonClaims();
  const reduced = useEduReducedMotion();
  if (!race) return null;
  const cols = race.slots.length <= 4 ? 'grid-cols-2' : race.slots.length <= 9 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <section
      data-testid="projector-lesson-claims"
      aria-label={t('education.race.projectorTitle')}
      className={cn(
        'flex h-full min-h-0 flex-col gap-[clamp(6px,1.6cqh,18px)] overflow-hidden [container-type:size]',
        'rounded-neo-lg border-[3px] border-neo-cream/40 bg-neo-navy-elevated p-[clamp(8px,2cqh,24px)] text-neo-cream shadow-hard-lg',
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 font-neo-display font-black uppercase tracking-wide text-[clamp(12px,5cqh,34px)]">
        <span className="flex min-w-0 items-center gap-2">
          <Target className="size-[1em] shrink-0 text-neo-cyan" aria-hidden />
          <span className="truncate">{t('education.race.projectorTitle')}</span>
        </span>
        <Pop pulseKey={race.claimedCount} className="shrink-0 rounded-full border-2 border-neo-black bg-neo-yellow px-[0.6em] text-neo-black tabular-nums shadow-hard-sm">
          {t('education.race.claimedCount', { claimed: race.claimedCount, total: race.total })}
        </Pop>
      </header>
      <ul className={cn('grid min-h-0 flex-1 auto-rows-fr gap-[clamp(4px,1.2cqh,14px)]', cols)}>
        {race.slots.map((slot) => <ClaimTile key={slot.index} slot={slot} reduced={reduced} t={t} />)}
      </ul>
    </section>
  );
});

function ClaimTile({ slot, reduced, t }: { slot: LessonClaimSlot; reduced: boolean; t: ProjectorLessonClaimsProps['t'] }) {
  const claim = slot.claim;
  return (
    <li
      data-state={claim ? 'claimed' : 'hidden'}
      aria-label={claim ? t('education.race.takenBy', { word: claim.word, name: claim.username }) : t('education.wordBank.huntHidden', { length: slot.length })}
      className="min-h-0 [perspective:600px]"
    >
      <m.div
        key={claim ? 'claimed' : 'hidden'}
        initial={claim && !reduced ? { rotateX: -90 } : false}
        animate={{ rotateX: 0 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 18 }}
        className={cn(
          'flex h-full min-h-0 flex-col items-center justify-center gap-[0.15em] rounded-neo border-[3px] border-neo-black px-[0.4em] text-center font-neo-display font-black leading-none shadow-hard-sm',
          'text-[clamp(12px,6cqh,46px)]',
          claim ? 'bg-neo-lime text-neo-black' : 'bg-neo-cream text-neo-black',
        )}
      >
        {claim ? (
          <>
            <span dir="auto" className="max-w-full truncate uppercase">{claim.word}</span>
            <span className="flex max-w-full items-center gap-[0.3em] font-neo-body text-[0.5em] font-bold">
              {claim.avatar?.emoji && <span aria-hidden="true">{claim.avatar.emoji}</span>}
              <span dir="auto" className="truncate">{claim.username}</span>
            </span>
          </>
        ) : (
          <span aria-hidden="true" className="uppercase">
            {slot.first}
            <span className="ms-[0.15em] tracking-[0.15em] text-neo-black/45">{'·'.repeat(Math.max(0, slot.length - 1))}</span>
          </span>
        )}
      </m.div>
    </li>
  );
}

export default ProjectorLessonClaims;
