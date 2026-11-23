'use client';

import { useEffect } from 'react';
import { useExperiment } from '@/hooks/useExperiment';
import { useStuckCoach } from '@/hooks/useStuckCoach';
import { trackGrowthEvent } from '@/utils/growthTracking';

/**
 * exp-wordwheel-drag-hint-v1: the shared stuck coach, drag-hint arm only. Keeps
 * the experiment's 6s idle so the running test still compares one treatment.
 */
export function useWheelDragHint(wordsFound: number, active: boolean) {
  const { variant, trackExposure } = useExperiment('exp-wordwheel-drag-hint-v1');
  useEffect(() => {
    trackExposure();
  }, [trackExposure]);
  return useStuckCoach({
    mode: 'dailyWheel',
    active: active && variant === 'drag-hint',
    wordsFound,
    idleThresholdMs: 6000,
    onShown: () => trackGrowthEvent('wordwheel_drag_hint_shown', { variant }),
    onDismissed: () => trackGrowthEvent('wordwheel_drag_hint_dismissed', { variant }),
  });
}
