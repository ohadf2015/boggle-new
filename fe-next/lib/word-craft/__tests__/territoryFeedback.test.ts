import { describe, it, expect } from 'vitest';
import { cellsGainedThisTurn } from '../territoryFeedback';

describe('cellsGainedThisTurn', () => {
  it('counts only claimed cells when there is no capture this turn', () => {
    expect(cellsGainedThisTurn(3, 'player', 0, null)).toEqual({ claimed: 3, stolen: 0, total: 3 });
  });

  it('adds stolen cells when this seat captured on this turn', () => {
    const capture = { by: 'player' as const, cellCount: 2, turnIndex: 5 };
    expect(cellsGainedThisTurn(3, 'player', 5, capture)).toEqual({ claimed: 3, stolen: 2, total: 5 });
  });

  it('ignores a capture made by the other seat', () => {
    const capture = { by: 'bot' as const, cellCount: 4, turnIndex: 5 };
    expect(cellsGainedThisTurn(3, 'player', 5, capture)).toEqual({ claimed: 3, stolen: 0, total: 3 });
  });

  it('ignores a stale capture from a different turn', () => {
    const capture = { by: 'player' as const, cellCount: 4, turnIndex: 2 };
    expect(cellsGainedThisTurn(3, 'player', 5, capture)).toEqual({ claimed: 3, stolen: 0, total: 3 });
  });

  it('clamps negative inputs to zero', () => {
    expect(cellsGainedThisTurn(-1, 'player', 0, null)).toEqual({ claimed: 0, stolen: 0, total: 0 });
  });
});
