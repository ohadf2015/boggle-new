import { describe, it, expect } from 'vitest';
import { resolveScoreboardOpponent } from '../opponentIdentity';

const base = {
  hotseat: false,
  botLabel: 'WordBot',
  hotseatLabel: 'Player 2',
};

describe('resolveScoreboardOpponent', () => {
  it('represents the live on-board bot with a seeded face (never faceless)', () => {
    const op = resolveScoreboardOpponent(base);
    expect(op.name).toBe('WordBot');
    expect(op.avatar).toBeNull();
    expect(op.isBot).toBe(true);
    expect(op.seed).toBe('wordbot');
  });

  it('uses the hot-seat label for a second human and is not a bot', () => {
    const op = resolveScoreboardOpponent({ ...base, hotseat: true });
    expect(op.name).toBe('Player 2');
    expect(op.isBot).toBe(false);
    expect(op.avatar).toBeNull();
    expect(op.seed).toBe('Player 2');
  });

  it('does not surface the async duel friend here (they live in the duel strip)', () => {
    // Even mid-duel the scoreboard opponent is the live bot — the friend is
    // shown separately so their name never sits beside the bot's live score.
    const op = resolveScoreboardOpponent(base);
    expect(op.isBot).toBe(true);
  });
});
