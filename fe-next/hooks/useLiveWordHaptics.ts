'use client';

import { useEffect, useRef } from 'react';
import { useFreshLastWord } from '@/components/multiplayer/round/useServerFloaters';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { liveHapticKind, pulseLive } from '@/lib/education/liveHaptics';

export function useLiveWordHaptics(enabled: boolean): void {
  const word = useFreshLastWord();
  const [reduced] = useReducedEffects();
  const best = useRef(0);

  useEffect(() => {
    if (!word || !enabled) return;
    const kind = liveHapticKind(word.points, best.current);
    best.current = Math.max(best.current, word.points);
    if (kind) pulseLive(kind, reduced);
    // Keyed on the event id only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.id]);
}
