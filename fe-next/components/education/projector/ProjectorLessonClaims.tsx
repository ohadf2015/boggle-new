'use client';

import { memo, type CSSProperties } from 'react';
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
  const cols = race.slots.length <= 4 ? 'grid-cols-2' : race.slots.length <= 9 ? 'grid-cols-3' : 'grid-cols-3 @min-[36rem]:grid-cols-4';

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
      <header className="flex shrink-0 items-center justify-between gap-2 font-neo-display font-black uppercase tracking-wide text-[clamp(14px,6.5cqh,34px)]">
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

/** Font that fits `chars` glyphs across the tile (Fredoka caps run about 0.62em each), capped by the tile height. */
function fitText(chars: number, perChar: number, heightShare: number): string {
  const share = Math.round((90 / Math.max(1, chars * perChar)) * 10) / 10;
  return `clamp(11px, min(${heightShare}cqh, ${share}cqw), 72px)`;
}

function ClaimTile({ slot, reduced, t }: { slot: LessonClaimSlot; reduced: boolean; t: ProjectorLessonClaimsProps['t'] }) {
  const claim = slot.claim;
  const chars = claim ? Array.from(claim.word).length : slot.length;
  return (
    <li
      data-state={claim ? 'claimed' : 'hidden'}
      aria-label={claim ? t('education.race.takenBy', { word: claim.word, name: claim.username }) : t('education.wordBank.huntHidden', { length: slot.length })}
      className="min-h-0 min-w-0 [perspective:600px]"
    >
      <m.div
        key={claim ? 'claimed' : 'hidden'}
        data-testid="claim-tile-face"
        initial={claim && !reduced ? { rotateX: -90 } : false}
        animate={{ rotateX: 0 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 18 }}
        className={cn(
          'flex h-full min-h-0 flex-col items-center justify-center gap-[4cqh] overflow-hidden rounded-neo border-[3px] border-neo-black px-[5cqw] text-center font-neo-display font-black leading-none shadow-hard-sm [container-type:size]',
          claim ? 'bg-neo-lime text-neo-black' : 'bg-neo-cream text-neo-black',
        )}
      >
        {claim ? (
          <>
            <span data-testid="claim-tile-text" dir="auto" className="max-w-full truncate text-[length:var(--fit)] uppercase" style={{ '--fit': fitText(chars, 0.62, 38) } as CSSProperties}>{claim.word}</span>
            <span className="flex max-w-full items-center gap-[0.3em] font-neo-body text-[clamp(10px,min(22cqh,11cqw),30px)] font-bold">
              {claim.avatar?.emoji && <span aria-hidden="true">{claim.avatar.emoji}</span>}
              <span dir="auto" className="truncate">{claim.username}</span>
            </span>
          </>
        ) : (
          <span data-testid="claim-tile-text" aria-hidden="true" className="max-w-full whitespace-nowrap text-[length:var(--fit)] uppercase" style={{ '--fit': fitText(chars, 0.5, 46) } as CSSProperties}>
            {slot.first}
            <span className="ms-[0.1em] tracking-[0.08em] text-neo-black/45">{'·'.repeat(Math.max(0, slot.length - 1))}</span>
          </span>
        )}
      </m.div>
    </li>
  );
}

export default ProjectorLessonClaims;
