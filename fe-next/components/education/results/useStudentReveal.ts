'use client';

import { useEffect, useState } from 'react';
import { STUDENT_REVEAL_FINAL, studentRevealTimeline, type RevealBeat } from './studentReveal';

/** The phone's round-end beats. Reduced motion paints the final state on the first render. */
export function useStudentReveal(reduceMotion: boolean): RevealBeat {
  const [beat, setBeat] = useState<RevealBeat>(() => (reduceMotion ? STUDENT_REVEAL_FINAL : studentRevealTimeline()[0].beat));

  useEffect(() => {
    if (reduceMotion) {
      setBeat(STUDENT_REVEAL_FINAL);
      return undefined;
    }
    const timers = studentRevealTimeline()
      .filter((step) => step.at > 0)
      .map((step) => setTimeout(() => setBeat(step.beat), step.at));
    return () => timers.forEach(clearTimeout);
  }, [reduceMotion]);

  return beat;
}
