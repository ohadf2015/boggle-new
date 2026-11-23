import { describe, it, expect } from 'vitest';
import { resetRoundStoreForNewGame } from '../playerRoundLifecycle';
import { useGameStore } from '@/hooks/gameState/store';

describe('resetRoundStoreForNewGame', () => {
  it('Given a blast board update left from the last round, When the room resets, Then it never reaches the next round', () => {
    useGameStore.getState().setBlastBoardUpdate({ grid: [['A']], tileStates: [], clearedBy: 'ana', word: 'A', clearedCount: 1, totalMoves: 1 });
    const actions = new Proxy({}, { get: () => () => {} }) as Parameters<typeof resetRoundStoreForNewGame>[0];

    resetRoundStoreForNewGame(actions);

    expect(useGameStore.getState().blastBoardUpdate).toBeNull();
  });
});
