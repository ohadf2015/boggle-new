import { describe, it, expect } from 'vitest';
import { DUEL_GOAL, applySpin, botSucceeds, duelTick, finalScore, newDuel, ruleFits, sideOf } from '../dreidel';

describe('Dreidel Duel', () => {
  it('Given a new duel, then both ante one gelt into a pot of 2', () => {
    const s = newDuel();
    expect([s.you, s.bot, s.pot]).toEqual([4, 4, 2]);
    expect(s.turn).toBe('you');
  });

  it('Given nun, then nothing happens and the turn passes', () => {
    const s = applySpin(newDuel(), 'nun', false);
    expect([s.you, s.bot, s.pot]).toEqual([4, 4, 2]);
    expect(s.turn).toBe('bot');
    expect(s.k).toBe(1);
  });

  it('Given gimel with a long word, then the spinner takes the whole pot and both ante again', () => {
    const s = applySpin(newDuel(), 'gimel', true);
    expect(s.you).toBe(5);
    expect(s.bot).toBe(3);
    expect(s.pot).toBe(2);
  });

  it('Given hei with any word, then the spinner takes half the pot rounded up', () => {
    const s = applySpin({ ...newDuel(), pot: 5 }, 'hei', true);
    expect(s.you).toBe(7);
    expect(s.pot).toBe(2);
  });

  it('Given shin without a word, then the spinner pays one gelt; with a word, nothing is paid', () => {
    expect(applySpin(newDuel(), 'shin', false).you).toBe(3);
    expect(applySpin(newDuel(), 'shin', true).you).toBe(4);
  });

  it('Given someone reaches the goal or cannot ante, then the duel ends', () => {
    const win = applySpin({ ...newDuel(), you: DUEL_GOAL - 2, pot: 4 }, 'gimel', true);
    expect(win.over).toBe(true);
    expect(win.won).toBe(true);
    const broke = applySpin({ ...newDuel(), you: 1 }, 'shin', false);
    expect(broke.over).toBe(true);
    expect(broke.won).toBe(false);
  });

  it('Given the clock runs out, then the gelt leader wins', () => {
    const s = duelTick({ ...newDuel(), you: 6, bot: 3, elapsed: 89.95 }, 0.1);
    expect(s.over).toBe(true);
    expect(s.won).toBe(true);
  });

  it('Given each side, then the word rule matches it', () => {
    expect(ruleFits('gimel', 'CANDLE', 6, null, 'en')).toBe(true);
    expect(ruleFits('gimel', 'OIL', 3, null, 'en')).toBe(false);
    expect(ruleFits('hei', 'OIL', 3, null, 'en')).toBe(true);
    expect(ruleFits('shin', 'LATKE', 5, 'K', 'en')).toBe(true);
    expect(ruleFits('shin', 'OIL', 3, 'K', 'en')).toBe(false);
    expect(sideOf(3)).toBe('shin');
  });

  it('Given the same spin index, then the bot result is stable', () => {
    expect(botSucceeds('hei', 7)).toBe(botSucceeds('hei', 7));
    expect(botSucceeds('nun', 3)).toBe(false);
  });

  it('Given gelt and words, then the final score adds capped gelt points', () => {
    expect(finalScore({ ...newDuel(), wordScore: 100, you: 50 })).toBe(500);
  });
});
