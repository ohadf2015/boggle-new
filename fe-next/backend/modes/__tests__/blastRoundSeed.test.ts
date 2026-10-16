import { describe, it, expect } from 'vitest';
import { blastMode } from '../blast';

function round(letterGrid: string[][]) {
  const game = {} as Record<string, unknown>;
  blastMode.initRound!({ game, gameCode: 'ROOM1', letterGrid, playerUsernames: ['ana', 'ben'] } as never);
  return (game.blastModeState as { seed: number }).seed;
}

describe('blast round seed', () => {
  it('gives each round in the same room its own special-tile layout', () => {
    expect(round([['c', 'a'], ['t', 's']])).not.toBe(round([['d', 'o'], ['g', 's']]));
  });

  it('is identical for the same round, so every player and a reconnect see one layout', () => {
    expect(round([['c', 'a'], ['t', 's']])).toBe(round([['c', 'a'], ['t', 's']]));
  });
});
