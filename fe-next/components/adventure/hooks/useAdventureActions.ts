/**
 * useAdventureActions — side-effect handlers: handleExitWithConfirm + handleRetry.
 */
import { useCallback } from 'react';
import { trackLevelRetried } from '@/utils/posthogEngagement';

interface Params {
  showLevelComplete: boolean;
  onExit: () => void;
  t: (key: string) => string;
  world: number;
  level: number;
  attemptCount: number;
  hintsUsedRef: { current: number };
  resetFlashGoldAward: () => void;
  resetTracking: () => void;
  resetLastWordTileTypes: () => void;
  handleRetryBase: () => void;
}

export function useAdventureActions(p: Params) {
  const {
    showLevelComplete, onExit, t, world, level, attemptCount,
    hintsUsedRef, resetFlashGoldAward, resetTracking, resetLastWordTileTypes, handleRetryBase,
  } = p;

  const handleExitWithConfirm = useCallback(() => {
    if (showLevelComplete) { onExit(); return; }
    if (window.confirm(t('adventure.game.confirmExitDesc'))) onExit();
  }, [onExit, showLevelComplete, t]);

  const handleRetry = useCallback(() => {
    trackLevelRetried({ world, level, attempt: attemptCount + 1 });
    hintsUsedRef.current = 0;
    resetFlashGoldAward();
    resetTracking();
    resetLastWordTileTypes();
    handleRetryBase();
  }, [world, level, attemptCount, hintsUsedRef, resetFlashGoldAward, resetTracking, resetLastWordTileTypes, handleRetryBase]);

  return { handleExitWithConfirm, handleRetry };
}
