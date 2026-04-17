/**
 * useLootCompletionFlow
 *
 * Routes end-of-level presentation between loot chest and level-complete
 * modal, and exposes callbacks for the story-beat and loot-chest continues.
 *
 * Extracted from AdventureGame.tsx.
 */

import { useCallback, useEffect } from 'react';

interface UseLootCompletionFlowProps {
  lootDropsLength: number;
  stars: number;
  nonBossCompleted: boolean;
  setShowLootChest: (v: boolean) => void;
  setShowLevelComplete: (v: boolean) => void;
  setShowStoryBeat: (v: boolean) => void;
}

interface UseLootCompletionFlowResult {
  showLootOrComplete: () => void;
  handleStoryBeatContinue: () => void;
  handleLootChestComplete: () => void;
}

export function useLootCompletionFlow({
  lootDropsLength,
  stars,
  nonBossCompleted,
  setShowLootChest,
  setShowLevelComplete,
  setShowStoryBeat,
}: UseLootCompletionFlowProps): UseLootCompletionFlowResult {
  const showLootOrComplete = useCallback(() => {
    if (lootDropsLength > 0 && stars > 0) {
      setShowLootChest(true);
    } else {
      setShowLevelComplete(true);
    }
  }, [lootDropsLength, stars, setShowLootChest, setShowLevelComplete]);

  useEffect(() => {
    if (nonBossCompleted) showLootOrComplete();
  }, [nonBossCompleted, showLootOrComplete]);

  const handleStoryBeatContinue = useCallback(() => {
    setShowStoryBeat(false);
    showLootOrComplete();
  }, [setShowStoryBeat, showLootOrComplete]);

  const handleLootChestComplete = useCallback(() => {
    setShowLootChest(false);
    setShowLevelComplete(true);
  }, [setShowLootChest, setShowLevelComplete]);

  return { showLootOrComplete, handleStoryBeatContinue, handleLootChestComplete };
}
