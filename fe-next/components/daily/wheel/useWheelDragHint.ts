'use client';

import { useCallback, useEffect } from 'react';
import { useExperiment } from '@/hooks/useExperiment';
import { useMPFTUEIdle } from '@/hooks/useMPFTUEIdle';
import { trackGrowthEvent } from '@/utils/growthTracking';

/** exp-wordwheel-drag-hint-v1: idle "swipe to spell" coachmark, suppressed once a word is found. */
export function useWheelDragHint(wordsFound: number) {
  const { variant, trackExposure } = useExperiment('exp-wordwheel-drag-hint-v1');
  useEffect(() => {
    trackExposure();
  }, [trackExposure]);
  const ftue = useMPFTUEIdle({
    enabled: variant === 'drag-hint',
    wordsFound,
    idleMs: 6000,
    storageKey: 'ww_ftue_drag_v1',
    onShown: () => trackGrowthEvent('wordwheel_drag_hint_shown', { variant }),
  });
  const { dismiss } = ftue;
  const onDismiss = useCallback(() => {
    trackGrowthEvent('wordwheel_drag_hint_dismissed', { variant });
    dismiss();
  }, [variant, dismiss]);
  return { visible: ftue.visible, markActivity: ftue.markActivity, onDismiss };
}
