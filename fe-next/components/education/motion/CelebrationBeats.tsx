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
    setBeat((prev) => (reached(prev, next) ? prev : next));
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
    if (skipped) return;
    const ids = [
      setTimeout(() => go('hero'), timeline.heroAt),
      setTimeout(() => go('pullBack'), timeline.pullBackAt),
      ...(timeline.chipsAt.length ? [setTimeout(() => go('chips'), timeline.chipsAt[0])] : []),
      ...(timeline.chipsAt.length ? [] : [setTimeout(() => go('done'), timeline.total)]),
    ];
    return () => ids.forEach(clearTimeout);
  }, [reduced, skipped, timeline, go, skip]);

  const onLand = useCallback(() => {
    onBeatRef.current?.('chip');
    landed.current += 1;
    if (landed.current === chips.length) go('done');
  }, [chips.length, go]);

  const heroFrame = beat === 'hold' ? null : beat === 'hero' ? EDU_PRESETS.heroIn : EDU_PRESETS.pullBack;
  const stagger = timeline.chipsAt.length > 1 ? timeline.chipsAt[1] - timeline.chipsAt[0] : undefined;
  const live = !skipped && beat !== 'done';
  const shown = (at: CelebrationBeat) => (reached(beat, at) ? '' : 'invisible');

  return (
    <div
      data-testid="edu-celebration"
      data-beat={beat}
      onClick={live ? skip : undefined}
      className={`fixed inset-0 z-50 flex h-dvh flex-col items-center overflow-hidden bg-neo-navy px-4 pt-14 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-neo-cream ${className}`}
    >
      {live ? (
        <button
          type="button"
          onClick={skip}
          className="absolute end-4 top-4 rounded-neo border-2 border-neo-cream px-3 py-1 font-neo-display text-xs font-black uppercase tracking-wide text-neo-cream"
        >
          {skipLabel}
        </button>
      ) : null}
      <div className="flex min-h-0 w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 text-center">
        <m.div
          data-slot="hero"
          initial={skipped ? false : EDU_PRESETS.heroIn.initial}
          animate={(heroFrame ?? EDU_PRESETS.heroIn).animate}
          transition={skipped || !heroFrame ? { duration: 0 } : heroFrame.transition}
          className={`flex min-h-0 shrink items-center justify-center ${shown('hero')}`}
        >
          {hero}
        </m.div>
        {headline ? (
          <div data-slot="headline" className={`font-neo-display text-3xl font-black text-neo-yellow ${shown('pullBack')}`}>
            {reached(beat, 'pullBack') ? <Pop>{headline}</Pop> : headline}
          </div>
        ) : null}
        {subtitle ? (
          <p data-slot="subtitle" className={`text-base font-bold text-neo-cream ${shown('pullBack')}`}>
            {subtitle}
          </p>
        ) : null}
        <div data-testid="edu-celebration-chips" className="min-h-[5.5rem] w-full">
          {reached(beat, 'chips') ? (
            <StaggerChips key={skipped ? 'still' : 'live'} chips={chips} staggerMs={stagger} instant={skipped} onLand={onLand} />
          ) : null}
        </div>
      </div>
      {cta ? (
        <div data-slot="cta" className={`w-full max-w-xl pt-4 ${shown('chips')}`}>
          {cta}
        </div>
      ) : null}
    </div>
  );
}
