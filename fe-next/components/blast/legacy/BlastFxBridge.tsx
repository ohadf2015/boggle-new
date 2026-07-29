'use client';

import { useEffect, useRef } from 'react';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

interface BlastFxBridgeProps {
  wordFoundCounter: number;
  comboBreakCounter: number;
  waveClearCounter: number;
}

export function BlastFxBridge({
  wordFoundCounter,
  comboBreakCounter,
  waveClearCounter,
}: BlastFxBridgeProps) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();

  const lastWordFound = useRef(0);
  const lastComboBreak = useRef(0);
  const lastWaveClear = useRef(0);

  const canSpawn = !prefersReducedMotion && enableComplexAnimations;

  useEffect(() => {
    if (wordFoundCounter === lastWordFound.current) return;
    lastWordFound.current = wordFoundCounter;
    if (!canSpawn) return;
    SharedFxApp.spawnBurst('word-found', window.innerWidth / 2, window.innerHeight / 2);
  }, [wordFoundCounter, canSpawn]);

  useEffect(() => {
    if (comboBreakCounter === lastComboBreak.current) return;
    lastComboBreak.current = comboBreakCounter;
    if (!canSpawn) return;
    SharedFxApp.spawnBurst('combo-break', window.innerWidth / 2, window.innerHeight / 2);
  }, [comboBreakCounter, canSpawn]);

  useEffect(() => {
    if (waveClearCounter === lastWaveClear.current) return;
    lastWaveClear.current = waveClearCounter;
    if (!canSpawn) return;

    const y = window.innerHeight / 2;
    const w = window.innerWidth;
    const positions = [0.2, 0.5, 0.8];
    const timers: ReturnType<typeof setTimeout>[] = [];

    SharedFxApp.spawnBurst('victory-burst', w * positions[0], y);
    timers.push(setTimeout(() => SharedFxApp.spawnBurst('victory-burst', w * positions[1], y), 250));
    timers.push(setTimeout(() => SharedFxApp.spawnBurst('victory-burst', w * positions[2], y), 500));

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [waveClearCounter, canSpawn]);

  return null;
}
