import { describe, expect, it } from 'vitest';
import {
  beginTurn,
  createPartyGame,
  endTurn,
  nextAfterBreakdown,
  submitWord,
} from '../engine';
import { defaultPartySetup } from '../setup';
import { rankPlayers } from '../scoring';

function alwaysValid(_word: string): boolean {
  return true;
}

describe('party engine', () => {
  it('starts on the hand-off screen with a shared board for round 1', () => {
    const game = createPartyGame(defaultPartySetup('en'));
    expect(game.phase).toBe('handoff');
    expect(game.roundIndex).toBe(0);
    expect(game.playerIndex).toBe(0);
    expect(game.board.length).toBeGreaterThanOrEqual(4);
    expect(game.board[0]?.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps the same board for every player in a round and dedups across them', () => {
    let game = createPartyGame(defaultPartySetup('en'));
    const board = game.board;
    game = beginTurn(game);
    expect(game.phase).toBe('play');
    game = submitWord(game, 'cat', alwaysValid);
    game = submitWord(game, 'cat', alwaysValid);
    expect(game.currentFound.filter((w) => w.word === 'cat')).toHaveLength(1);

    game = endTurn(game);
    expect(game.phase).toBe('handoff');
    expect(game.playerIndex).toBe(1);
    expect(game.board).toEqual(board);

    game = beginTurn(game);
    game = submitWord(game, 'cat', alwaysValid);
    const stolen = game.currentFound.find((w) => w.word === 'cat');
    expect(stolen?.unique).toBe(false);
    expect(game.currentScore).toBe(0);

    game = submitWord(game, 'dog', alwaysValid);
    expect(game.currentFound.find((w) => w.word === 'dog')?.unique).toBe(true);
    expect(game.currentScore).toBeGreaterThan(0);
  });

  it('walks handoff → play → breakdown → next round → podium with cumulative scores', () => {
    const setup = defaultPartySetup('en');
    setup.roundCount = 2;
    let game = createPartyGame(setup);

    for (let round = 0; round < 2; round += 1) {
      for (let p = 0; p < setup.players.length; p += 1) {
        expect(game.phase).toBe('handoff');
        game = beginTurn(game);
        game = submitWord(game, `w${round}${p}`, alwaysValid);
        game = endTurn(game);
      }
      expect(game.phase).toBe('roundBreakdown');
      expect(game.roundResults).toHaveLength(round + 1);
      game = nextAfterBreakdown(game);
    }

    expect(game.phase).toBe('podium');
    const ranked = rankPlayers(game.setup.players, game.totals);
    expect(ranked[0]?.score).toBeGreaterThan(0);
    const sum = Object.values(game.totals).reduce((s, n) => s + n, 0);
    expect(sum).toBeGreaterThan(0);
  });
});
