'use client';

import { memo, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils';
import { isReducedMotionPreferred } from '@/utils/accessibility';

export type WordCraftStep = 'pick' | 'place' | 'submit' | 'bot' | 'over' | 'idle';

export interface WordCraftStepHintProps {
  step: WordCraftStep;
  labels: Record<Exclude<WordCraftStep, 'idle'>, string>;
}

const COLOR: Record<Exclude<WordCraftStep, 'idle'>, string> = {
  pick: 'bg-neo-lime text-neo-navy',
  place: 'bg-neo-cyan text-neo-navy',
  submit: 'bg-neo-pink text-white',
  bot: 'bg-neo-purple text-white',
  over: 'bg-neo-yellow text-neo-navy',
};

function WordCraftStepHintImpl({ step, labels }: WordCraftStepHintProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef<WordCraftStep>(step);

  useEffect(() => {
    if (!ref.current) return;
    if (prevStepRef.current === step) return;
    prevStepRef.current = step;
    if (isReducedMotionPreferred()) return;
    gsap.fromTo(
      ref.current,
      { scale: 0.85, y: -4, opacity: 0.4 },
      { scale: 1, y: 0, opacity: 1, duration: 0.25, ease: 'back.out(2)' },
    );
  }, [step]);

  if (step === 'idle') {
    return <div data-wc-step-hint className="h-7" aria-hidden />;
  }

  return (
    <div data-wc-step-hint className="flex items-center justify-center" aria-live="polite" aria-atomic="true">
      <div
        ref={ref}
        data-step={step}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1 rounded-neo border-neo border-black shadow-hard-sm',
          'text-[11px] sm:text-xs font-neo-display font-black uppercase tracking-wider',
          COLOR[step],
        )}
      >
        <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        {labels[step]}
      </div>
    </div>
  );
}

export const WordCraftStepHint = memo(WordCraftStepHintImpl);
