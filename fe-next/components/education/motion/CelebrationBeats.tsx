'use client';

import { m } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { celebrationTimeline } from '@/lib/education/motion/celebrationTimeline';
import { EDU_PRESETS } from '@/lib/education/motion/presets';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';
import { Pop } from './Pop';
import { StaggerChips, type MotionChip } from './StaggerChips';

export type CelebrationBeat = 'hold' | 'hero' | 'pullBack' | 'chips' | 'done';
export type CelebrationCue = Exclude<CelebrationBeat, 'hold'> | 'chip';

export interface CelebrationBeatsProps {
  hero: ReactNode;
  headline?: ReactNode;
  subtitle?: ReactNode;
  chips: MotionChip[];
  cta?: ReactNode;
  skipLabel: string;
  /** Sound hooks: one cue per beat, plus 'chip' as each count-up lands. */
  onBeat?: (cue: CelebrationCue) => void;
  className?: string;
}

const ORDER: CelebrationBeat[] = ['hold', 'hero', 'pullBack', 'chips', 'done'];
const reached = (beat: CelebrationBeat, at: CelebrationBeat) => ORDER.indexOf(beat) >= ORDER.indexOf(at);

export function CelebrationBeats({ hero, headline, subtitle, chips, cta, skipLabel, onBeat, className = '' }: CelebrationBeatsProps) {
  const reduced = useEduReducedMotion();
  const [beat, setBeat] = useState<CelebrationBeat>(reduced ? 'done' : 'hold');
  const [skipped, setSkipped] = useState(reduced);
  const onBeatRef = useRef(onBeat);
  onBeatRef.current = onBeat;
  const timeline = useMemo(() => celebrationTimeline(chips.length), [chips.length]);
  const landed = useRef(0);

  const go = useCallback((next: CelebrationBeat) => {
    setBeat(next);
    if (next !== 'hold') onBeatRef.current?.(next);
  }, []);

  const skip = useCallback(() => {
    setSkipped(true);
    setBeat('done');
  }, []);

  useEffect(() => {
    if (reduced) {
      skip();
      return;
    }
    const ids = [
      setTimeout(() => go('hero'), timeline.heroAt),
      setTimeout(() => go('pullBack'), timeline.pullBackAt),
      ...(timeline.chipsAt.length ? [setTimeout(() => go('chips'), timeline.chipsAt[0])] : []),
      ...(timeline.chipsAt.length ? [] : [setTimeout(() => go('done'), timeline.total)]),
    ];
    return () => ids.forEach(clearTimeout);
  }, [reduced, timeline, go, skip]);

  const onLand = useCallback(() => {
    onBeatRef.current?.('chip');
    landed.current += 1;
    if (landed.current === chips.length) go('done');
  }, [chips.length, go]);

  const heroFrame = beat === 'hero' ? EDU_PRESETS.heroIn : EDU_PRESETS.pullBack;
  const stagger = timeline.chipsAt.length > 1 ? timeline.chipsAt[1] - timeline.chipsAt[0] : undefined;
  const live = !skipped && beat !== 'done';

  return (
    <div
      data-testid="edu-celebration"
      data-beat={beat}
      onClick={live ? skip : undefined}
      className={`fixed inset-0 z-50 flex h-dvh flex-col items-center overflow-hidden bg-neo-navy px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-neo-cream ${className}`}
    >
      {live ? (
        <button
          type="button"
          onClick={skip}
          className="self-end rounded-neo border-2 border-neo-cream px-3 py-1 font-neo-display text-xs font-black uppercase tracking-wide text-neo-cream"
        >
          {skipLabel}
        </button>
      ) : null}
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        {reached(beat, 'hero') ? (
          <m.div
            initial={skipped ? false : EDU_PRESETS.heroIn.initial}
            animate={heroFrame.animate}
            transition={skipped ? { duration: 0 } : heroFrame.transition}
            className="flex max-h-full items-center justify-center"
          >
            {hero}
          </m.div>
        ) : null}
      </div>
      <div className="flex w-full max-w-xl flex-col items-center gap-4 text-center">
        {reached(beat, 'pullBack') && headline ? (
          <Pop className="font-neo-display text-3xl font-black text-neo-yellow">{headline}</Pop>
        ) : null}
        {reached(beat, 'pullBack') && subtitle ? <p className="text-base font-bold text-neo-cream">{subtitle}</p> : null}
        {reached(beat, 'chips') ? (
          <StaggerChips key={skipped ? 'still' : 'live'} chips={chips} staggerMs={stagger} instant={skipped} onLand={onLand} />
        ) : null}
        {reached(beat, 'chips') && cta ? <div className="w-full pt-2">{cta}</div> : null}
      </div>
    </div>
  );
}
