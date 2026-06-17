import { useEffect } from 'react';
import { useExperiment } from '@/hooks/useExperiment';
import {
  resolveQuitConfirmDescription,
  type QuitConfirmCopyInput,
} from '@/lib/experiments/quitConfirmDescription';

/**
 * exp-game-abandon-confirm-v1 wiring for the single-player quit-confirm dialog.
 *
 * Returns the dialog description to render and fires the experiment exposure exactly once the
 * stats-shown variant's UI is actually presented (dialog open) — never for the control bucket,
 * so the exposure population stays clean. Conversion (game_completed after the dialog) is tracked
 * elsewhere via existing growth events. Defaults to control, so this is dark until the flag is
 * enabled in PostHog.
 */
export function useQuitConfirmDescription(
  args: QuitConfirmCopyInput & { open: boolean },
): string {
  const { variant, trackExposure } = useExperiment('exp-game-abandon-confirm-v1');
  useEffect(() => {
    if (args.open && variant === 'stats-shown') trackExposure();
  }, [args.open, variant, trackExposure]);
  return resolveQuitConfirmDescription(variant, args);
}
