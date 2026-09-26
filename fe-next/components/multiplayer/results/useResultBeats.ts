'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireRankConfetti } from '@/utils/confettiUtils';
import { prefersStaticFullscreenOverlay } from '@/lib/native/webViewLayerFlash';
import { REVEAL, type RevealEventName } from './revealTimeline';

interface Options {
  myRank: number;
  isWinner: boolean;
  topScore: number;
  runnerUpScore: number;
  /** Reduced motion: no choreography, no confetti — the verdict sound once on mount. */
  instant: boolean;
}

/**
 * What each reveal beat SOUNDS/LOOKS like. The verdict (victory / epic /
 * defeat + podium confetti) fires exactly once — on 1st place's slam, or at
 * once when the show is skipped or reduced — never twice.
 */
export function useResultBeats({ myRank, isWinner, topScore, runnerUpScore, instant }: Options) {
  const { playVictorySound, playDefeatSound, playEpicVictorySound, playTileAppearSound } = useSoundEffects();
  const verdictFiredRef = useRef(false);

  const fireVerdict = useCallback((withConfetti: boolean) => {
    if (verdictFiredRef.current) return;
    verdictFiredRef.current = true;
    if (isWinner) {
      if (runnerUpScore > 0 && topScore >= runnerUpScore * 2) playEpicVictorySound();
      else playVictorySound();
    } else {
      playDefeatSound();
    }
    // Podium only (confetti for last place reads as mockery); never on the
    // native/mobile-web static-overlay path (Chromium layer flash, class 5).
    if (withConfetti && myRank >= 1 && myRank <= 3 && !prefersStaticFullscreenOverlay()) {
      fireRankConfetti(myRank, myRank === 1 ? 'full' : 'light');
    }
  }, [isWinner, topScore, runnerUpScore, myRank, playVictorySound, playEpicVictorySound, playDefeatSound]);

  useEffect(() => {
    if (instant) fireVerdict(false);
  }, [instant, fireVerdict]);

  const onBeat = useCallback((name: RevealEventName) => {
    if (name === 'row-1') fireVerdict(true);
    else if (name.startsWith('row-')) playTileAppearSound?.();
  }, [fireVerdict, playTileAppearSound]);

  return { onBeat, fireVerdict };
}

/**
 * Intermission vs final is read from props only AFTER the TIME! beat: the
 * series tracker records this round in the parent's effect, so the first
 * frame still shows the previous round count (pitfall class 1). Once read it
 * is frozen — a host's "new series" must not flip the screen under everyone.
 */
export function useLockedBranch(isFinalLive: boolean) {
  const [branch, setBranch] = useState<'final' | 'intermission' | null>(null);
  const liveRef = useRef(isFinalLive);
  useEffect(() => {
    liveRef.current = isFinalLive;
  }, [isFinalLive]);
  const lock = useCallback(() => {
    setBranch((b) => b ?? (liveRef.current ? 'final' : 'intermission'));
  }, []);
  useEffect(() => {
    const id = setTimeout(lock, REVEAL.timeMs);
    return () => clearTimeout(id);
  }, [lock]);
  return { branch, lock };
}
