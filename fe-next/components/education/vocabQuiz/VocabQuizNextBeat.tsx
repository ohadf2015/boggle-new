/**
 * Live Vocab Quiz: the "what happens next" line on the student's verdict sheet.
 *
 * The class is paced by the server, so there is no Continue button; a strip
 * that drains over the reveal beat tells the student the next word is coming.
 */

'use client';

import { useEffect, useRef } from 'react';
import type { TranslateFn } from '@/shared/types/vocabQuiz';

export interface VocabQuizNextBeatProps {
  nextInMs: number;
  /** Changes per question, so each reveal restarts the drain. */
  beatKey: number | string;
  isLast: boolean;
  paused: boolean;
  reduced: boolean;
  t: TranslateFn;
}

export function VocabQuizNextBeat({ nextInMs, beatKey, isLast, paused, reduced, t }: VocabQuizNextBeatProps) {
  const fillRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<Animation | null>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const el = fillRef.current;
    if (reduced || !el || typeof el.animate !== 'function') return;
    const anim = el.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
      duration: nextInMs,
      easing: 'linear',
      fill: 'forwards',
    });
    if (pausedRef.current) anim.pause();
    animRef.current = anim;
    return () => {
      anim.cancel();
      animRef.current = null;
    };
  }, [beatKey, nextInMs, reduced]);

  useEffect(() => {
    const anim = animRef.current;
    if (!anim) return;
    if (paused) anim.pause();
    else anim.play();
  }, [paused]);

  return (
    <div data-testid="vocab-quiz-next-beat" className="flex w-full min-w-0 shrink-0 items-center gap-2">
      <span className="shrink-0 font-neo-display text-xs font-black uppercase tracking-wider sm:text-sm">
        {t(isLast ? 'vocabQuiz.nextUp.finalScores' : 'vocabQuiz.nextUp.label')}
      </span>
      {!reduced && (
        <span aria-hidden className="h-2 min-w-0 flex-1 overflow-hidden rounded-full border-[1.5px] border-neo-black bg-neo-white">
          <span ref={fillRef} className="block h-full w-full origin-left bg-neo-black rtl:origin-right" />
        </span>
      )}
    </div>
  );
}

export default VocabQuizNextBeat;
