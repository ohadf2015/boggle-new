'use client';

import { memo, useEffect, useRef, useState, type RefObject } from 'react';
import { m } from 'framer-motion';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Pop } from '@/components/education/motion/Pop';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';
import { useLessonClaims } from '@/components/education/live/useLessonClaims';
import type { LessonClaimSlot } from '@/shared/types/lessonClaims';
import { raceTilesToShow } from './raceCapacity';

export interface ProjectorLessonClaimsProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  className?: string;
}

/**
 * The class's shared race board: each placed lesson word as a masked tile that flips to the word and
 * its claimer on one line. Tiles keep a legible height; what does not fit folds into a "+N" tile.
 */
export const ProjectorLessonClaims = memo(function ProjectorLessonClaims({ t, className }: ProjectorLessonClaimsProps) {
  const race = useLessonClaims();
  const reduced = useEduReducedMotion();
  const listRef = useRef<HTMLUListElement>(null);
  const capacity = useTileCapacity(listRef);
  if (!race) return null;
  const { shown, hidden } = raceTilesToShow(race.slots, capacity);

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
      <header className="flex shrink-0 items-center justify-between gap-2 font-neo-display font-black uppercase tracking-wide text-[clamp(18px,min(8cqh,4.6cqw),40px)] @max-[15rem]:flex-col @max-[15rem]:items-start @max-[15rem]:gap-1 @max-[15rem]:text-base">
        <span className="flex min-w-0 items-center gap-2">
          <Target className="size-[1em] shrink-0 text-neo-cyan" aria-hidden />
          <span className="truncate">{t('education.race.projectorTitle')}</span>
        </span>
        <Pop pulseKey={race.claimedCount} className="shrink-0 rounded-full border-2 border-neo-black bg-neo-yellow px-[0.6em] text-neo-black tabular-nums shadow-hard-sm">
          {t('education.race.claimedCount', { claimed: race.claimedCount, total: race.total })}
        </Pop>
      </header>
      <ul ref={listRef} className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-hidden @max-[15rem]:grid-cols-1 @min-[24rem]:grid-cols-3">
        {shown.map((slot) => <ClaimTile key={slot.index} slot={slot} reduced={reduced} t={t} />)}
        {hidden > 0 && (
          <li data-testid="claim-tiles-more" className={cn(TILE, 'justify-center border-dashed border-neo-cream/60 bg-neo-navy text-neo-cream')}>
            {t('education.projectorLobby.moreWords', { count: hidden })}
          </li>
        )}
      </ul>
    </section>
  );
});

const TILE = 'flex min-h-[2em] min-w-0 flex-row items-center gap-[0.35em] rounded-neo border-[3px] px-[0.45em] font-neo-display font-black leading-none shadow-hard-sm text-[clamp(16px,min(3.6cqw,7cqh),30px)]';

/** How many whole tiles fit the list: rows that fit times the columns the grid resolved to. Unmeasured (SSR, jsdom) = all. */
function useTileCapacity(ref: RefObject<HTMLUListElement | null>): number {
  const [capacity, setCapacity] = useState(Infinity);
  useEffect(() => {
    const list = ref.current;
    if (!list || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const tile = list.firstElementChild as HTMLElement | null;
      if (!tile || !list.clientHeight || !tile.offsetHeight) return;
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      const cols = getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
      const rows = Math.max(1, Math.floor((list.clientHeight + gap) / (tile.offsetHeight + gap)));
      setCapacity(rows * cols);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [ref]);
  return capacity;
}

function ClaimTile({ slot, reduced, t }: { slot: LessonClaimSlot; reduced: boolean; t: ProjectorLessonClaimsProps['t'] }) {
  const claim = slot.claim;
  return (
    <li
      data-state={claim ? 'claimed' : 'hidden'}
      aria-label={claim ? t('education.race.takenBy', { word: claim.word, name: claim.username }) : t('education.wordBank.huntHidden', { length: slot.length })}
      className="min-w-0 [perspective:600px]"
    >
      <m.div
        key={claim ? 'claimed' : 'hidden'}
        data-testid="claim-tile-face"
        initial={claim && !reduced ? { rotateX: -90 } : false}
        animate={{ rotateX: 0 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 18 }}
        className={cn(TILE, 'h-full justify-center border-neo-black text-neo-black', claim ? 'bg-neo-lime' : 'bg-neo-cream')}
      >
        {claim ? (
          <>
            <span data-testid="claim-tile-text" dir="auto" className="shrink-0 whitespace-nowrap uppercase">{claim.word}</span>
            <span data-testid="claim-tile-name" className="min-w-0 truncate font-neo-body text-[0.72em] font-bold">
              <span aria-hidden="true">· </span>
              {claim.avatar?.emoji && <span aria-hidden="true">{claim.avatar.emoji} </span>}
              <bdi>{claim.username}</bdi>
            </span>
          </>
        ) : (
          <span data-testid="claim-tile-text" aria-hidden="true" className="shrink-0 whitespace-nowrap uppercase">
            {slot.first}
            <span className="ms-[0.1em] tracking-[0.08em] text-neo-black/45">{'·'.repeat(Math.max(0, slot.length - 1))}</span>
          </span>
        )}
      </m.div>
    </li>
  );
}

export default ProjectorLessonClaims;
