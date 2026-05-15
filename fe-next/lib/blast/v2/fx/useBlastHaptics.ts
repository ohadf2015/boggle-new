'use client';
import { useEffect, useRef } from 'react';
import { useHaptics } from './haptics';

type Args = {
  selectionCount: number;
  invalidKey: number;
  foundCount: number;
  status: 'playing' | 'levelComplete';
};

/**
 * Routes core game-state transitions to native vibration. Pairs with the
 * existing chain-tier haptics — this one covers the moment-to-moment touch
 * loop (tile drag, invalid word, valid word, level done) while
 * useChainHaptics handles cascade ovations.
 */
export function useBlastHaptics({ selectionCount, invalidKey, foundCount, status }: Args) {
  const { vibrateLight, vibrateMedium, vibrateHeavy, vibrateSuccessChord } = useHaptics();

  const prevSelection = useRef(selectionCount);
  useEffect(() => {
    if (selectionCount > prevSelection.current) {
      vibrateLight();
    }
    prevSelection.current = selectionCount;
  }, [selectionCount, vibrateLight]);

  const prevInvalid = useRef(invalidKey);
  useEffect(() => {
    if (invalidKey !== prevInvalid.current) {
      // Short stutter — distinct from the single light tick of a successful
      // tile entry. Players feel the rejection without an aggressive buzz.
      navigator.vibrate?.([30, 40, 30]);
      prevInvalid.current = invalidKey;
    }
  }, [invalidKey]);

  const prevFound = useRef(foundCount);
  useEffect(() => {
    if (foundCount > prevFound.current) {
      vibrateMedium();
    }
    prevFound.current = foundCount;
  }, [foundCount, vibrateMedium]);

  const prevStatus = useRef(status);
  useEffect(() => {
    if (status === 'levelComplete' && prevStatus.current !== 'levelComplete') {
      vibrateSuccessChord();
    }
    prevStatus.current = status;
  }, [status, vibrateHeavy, vibrateSuccessChord]);
}
