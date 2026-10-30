import { describe, it, expect } from 'vitest';
import { claimResultsPersist } from '../resultsPersistOnce';

describe('claimResultsPersist', () => {
  it('grants the first claim for a round and refuses a repeat', () => {
    const game = { gameSessionId: 3 };
    expect(claimResultsPersist(game)).toBe(true);
    expect(claimResultsPersist(game)).toBe(false);
  });

  it('grants again once the room moves to its next round', () => {
    const game = { gameSessionId: 3 };
    claimResultsPersist(game);
    game.gameSessionId = 4;
    expect(claimResultsPersist(game)).toBe(true);
  });

  it('keeps rooms independent', () => {
    expect(claimResultsPersist({ gameSessionId: 1 })).toBe(true);
    expect(claimResultsPersist({ gameSessionId: 1 })).toBe(true);
  });
});
