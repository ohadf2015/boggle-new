import { useEffect } from 'react';
import { useExperiment } from '@/hooks/useExperiment';
import { shouldShowRetryCta } from '@/lib/experiments/practiceWheelRetryCta';

/**
 * exp-practice-wheel-cta-v1 — retry CTA on the WheelRush practice game-over screen.
 *
 * Returns true when the retry-cta variant is active for this user.
 * Fires experiment_exposed exactly once when the game-over state is presented
 * to the variant-B bucket, keeping the exposure population clean.
 */
export function usePracticeWheelRetryCta(gameOverVisible: boolean): boolean {
  const { variant, trackExposure } = useExperiment('exp-practice-wheel-cta-v1');
  const show = shouldShowRetryCta(variant);

  useEffect(() => {
    if (gameOverVisible && show) trackExposure();
  }, [gameOverVisible, show, trackExposure]);

  return show;
}
