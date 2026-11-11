'use client';

import { useEffect, useState } from 'react';
import { Pop } from '@/components/education/motion/Pop';
import { cn } from '@/lib/utils';
import type { StripSlot } from './lessonTargets';
import { raceMiniView } from './roundBarModel';
import { useLastLessonClaim } from './useLessonClaims';

type T = (key: string, params?: Record<string, string | number>) => string;

const FRESH_MS = 4000;

const CHIP_BY_STATE: Record<StripSlot['state'], string> = {
  hidden: 'bg-neo-cream text-neo-black',
  mine: 'bg-neo-lime text-neo-black',
  taken: 'bg-neo-pink text-neo-black',
};

function useFreshClaimIndex(): number | null {
  const claim = useLastLessonClaim();
  const [fresh, setFresh] = useState<number | null>(null);
  useEffect(() => {
    if (!claim) return undefined;
    setFresh(claim.index);
    const timer = window.setTimeout(() => setFresh(null), FRESH_MS);
    return () => window.clearTimeout(timer);
  }, [claim]);
  return fresh;
}

/** The word race folded to "6/12" plus one chip: the latest claim for a moment, otherwise the next word to hunt. */
export function RaceMini({ slots, t, dir, className }: { slots: StripSlot[]; t: T; dir: 'ltr' | 'rtl'; className?: string }) {
  const { done, total, chip, mine, mineCount } = raceMiniView(slots, useFreshClaimIndex());
  const label = chip?.state === 'taken'
    ? t('education.race.takenBy', { word: chip.word ?? '', name: chip.by ?? '' })
    : chip?.state === 'hidden'
      ? t('education.wordBank.huntHidden', { length: chip.rest + 1 })
      : undefined;

  return (
    <div
      data-testid="race-mini"
      dir={dir}
      className={cn('pointer-events-none flex min-h-9 min-w-0 items-center gap-1.5 rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-1.5 text-neo-cream shadow-hard-sm', className)}
    >
      <Pop pulseKey={done} className="shrink-0">
        <span data-testid="lesson-target-count" dir="ltr" aria-hidden="true" className="inline-block rounded-full border-2 border-neo-black bg-neo-cyan px-1.5 py-0.5 font-neo-display text-[13px] font-black leading-none text-neo-black tabular-nums">
          {`${done}/${total}`}
        </span>
      </Pop>
      <span className="sr-only">{t('education.race.claimedCount', { claimed: done, total })}</span>
      {mine && (
        <Pop key={`mine:${mine.key}`} pulseKey={`mine:${mine.key}`} className="shrink-0">
          <span
            data-testid="race-mini-mine"
            className={cn('flex h-7 items-center gap-1 whitespace-nowrap rounded-neo border-2 border-neo-black px-1.5 font-neo-display text-[13px] font-black uppercase leading-none shadow-hard-sm', CHIP_BY_STATE.mine)}
          >
            <span dir="auto">{mine.word}</span>
            {mineCount > 1 && <span dir="ltr" className="text-[11px]">{`+${mineCount - 1}`}</span>}
          </span>
        </Pop>
      )}
      {chip && (
        <Pop key={`${chip.key}:${chip.state}`} pulseKey={`${chip.key}:${chip.state}`} className={chip.state === 'hidden' ? 'min-w-0' : 'shrink-0'}>
          <span
            data-testid="race-mini-chip"
            data-state={chip.state}
            aria-label={label}
            className={cn('flex h-7 min-w-0 items-center gap-1 whitespace-nowrap rounded-neo border-2 border-neo-black px-1.5 font-neo-display text-[13px] font-black uppercase leading-none shadow-hard-sm', CHIP_BY_STATE[chip.state])}
          >
            {chip.state === 'hidden' ? (
              <span aria-hidden="true" className="flex min-w-0">
                <span className="shrink-0">{chip.first}</span>
                <span className="ms-0.5 min-w-0 overflow-hidden tracking-[0.05em] text-neo-black/45">{'·'.repeat(chip.rest)}</span>
              </span>
            ) : (
              <>
                {chip.state === 'taken' && chip.avatar?.emoji && <span aria-hidden="true" className="normal-case">{chip.avatar.emoji}</span>}
                <span dir="auto" aria-hidden={chip.state === 'taken' ? 'true' : undefined} className={chip.state === 'taken' ? 'line-through decoration-2' : undefined}>{chip.word}</span>
              </>
            )}
          </span>
        </Pop>
      )}
    </div>
  );
}

export default RaceMini;
