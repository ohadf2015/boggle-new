import { useCallback, useState } from 'react';

const GHOST_INTERVAL = 6;

/** Every ~6th player turn a hidden ×2 multiplier fires on valid submission. */
export function useShiritoriGhostMultiplier() {
  const [playerTurnCount, setPlayerTurnCount] = useState(0);

  const isGhostTurn = playerTurnCount % GHOST_INTERVAL === GHOST_INTERVAL - 1;
  const multiplier = isGhostTurn ? 2 : 1;

  const markTurnPlayed = useCallback(() => {
    setPlayerTurnCount((c) => c + 1);
  }, []);

  const reset = useCallback(() => {
    setPlayerTurnCount(0);
  }, []);

  return { isGhostTurn, multiplier, playerTurnCount, markTurnPlayed, reset };
}
