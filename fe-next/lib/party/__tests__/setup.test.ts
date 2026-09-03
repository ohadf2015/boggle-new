import { describe, expect, it } from 'vitest';
import { defaultPartySetup, validatePartySetup } from '../setup';

describe('validatePartySetup', () => {
  it('accepts a 2-player default setup', () => {
    const setup = defaultPartySetup('en');
    const result = validatePartySetup(setup);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(setup.players).toHaveLength(2);
  });

  it('rejects fewer than 2 or more than 6 players', () => {
    const one = defaultPartySetup('en');
    one.players = [one.players[0]!];
    expect(validatePartySetup(one).ok).toBe(false);
    expect(validatePartySetup(one).errors).toContain('minPlayers');

    const many = defaultPartySetup('en');
    many.players = Array.from({ length: 7 }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
      color: '#000',
      emoji: '🐶',
    }));
    expect(validatePartySetup(many).ok).toBe(false);
    expect(validatePartySetup(many).errors).toContain('maxPlayers');
  });

  it('rejects blank or duplicate names', () => {
    const blank = defaultPartySetup('en');
    blank.players[0]!.name = '   ';
    expect(validatePartySetup(blank).errors).toContain('emptyName');

    const dup = defaultPartySetup('en');
    dup.players[1]!.name = dup.players[0]!.name;
    expect(validatePartySetup(dup).errors).toContain('nameTaken');
  });

  it('rejects out-of-range rounds, timer, and board size', () => {
    const rounds = defaultPartySetup('en');
    rounds.roundCount = 0;
    expect(validatePartySetup(rounds).errors).toContain('rounds');

    const timer = defaultPartySetup('en');
    timer.timerSeconds = 10;
    expect(validatePartySetup(timer).errors).toContain('timer');

    const board = defaultPartySetup('en');
    board.rows = 3;
    board.cols = 3;
    expect(validatePartySetup(board).errors).toContain('boardSize');
  });
});
