import { describe, it, expect } from 'vitest';
import { reviveBlastModeState } from '../gameState/reviveBlastState';
import type { BlastModeState } from '@/shared/types/game';

const legacyTile = (type: string) => ({
  uid: 'u', row: 0, col: 0, type, isCleared: false, activationEffect: null, hitsRemaining: 2, innerType: 'bomb', isThawed: false,
});

describe('reviveBlastModeState — games saved before the roster cut', () => {
  it('normalizes retired tile types on the template, its overlay and every player board', () => {
    const saved = JSON.parse(JSON.stringify({
      overlay: [{ row: 0, col: 0, type: 'ice' }, { row: 0, col: 1, type: 'bomb' }],
      tileStates: [[legacyTile('frozen'), { ...legacyTile('gold'), col: 1, hitsRemaining: 0 }]],
      playerBoards: {
        alice: {
          grid: [['A', 'B']],
          tileStates: [[legacyTile('prism'), { ...legacyTile('diamond'), col: 1 }]],
          overlay: [{ row: 0, col: 0, type: 'lightning' }],
          seed: 1, totalMoves: 0, refillCount: 0,
        },
      },
      playerMoves: {}, playerBonusMoves: {}, playerStats: {},
    })) as BlastModeState;

    const revived = reviveBlastModeState(saved)!;

    expect(revived.overlay.map(o => o.type)).toEqual(['standard', 'bomb']);
    expect(revived.tileStates![0].map(t => t.type)).toEqual(['standard', 'gold']);
    expect(revived.tileStates![0][0]).not.toHaveProperty('innerType');
    expect(revived.tileStates![0][0].hitsRemaining).toBe(0);
    const alice = revived.playerBoards!.alice;
    expect(alice.tileStates[0].map(t => t.type)).toEqual(['standard', 'diamond']);
    expect(alice.overlayMap.get('0,0')).toBe('standard');
  });
});
