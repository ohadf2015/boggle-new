'use client';
import { useEffect, useRef } from 'react';
import { classifyOvation } from '../engine';
import { useHaptics } from './haptics';

type Args = { chainEventKey: number; chainDepth: number };

export function useChainHaptics({ chainEventKey, chainDepth }: Args) {
  const lastKey = useRef<number | undefined>(undefined);
  const { vibrateMedium, vibrateHeavy, vibrateSuccessChord } = useHaptics();
  useEffect(() => {
    if (chainEventKey === lastKey.current) return;
    lastKey.current = chainEventKey;
    const tier = classifyOvation(chainDepth);
    if (tier === 'small') vibrateMedium();
    else if (tier === 'big') vibrateHeavy();
    else if (tier === 'mega') vibrateSuccessChord();
  }, [chainEventKey, chainDepth, vibrateMedium, vibrateHeavy, vibrateSuccessChord]);
}
