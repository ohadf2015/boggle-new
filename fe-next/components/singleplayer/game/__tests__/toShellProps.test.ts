import { describe, it, expect } from 'vitest';
import { toShellProps, toShellLeaderboard, toPlayerRank } from '../toShellProps';
import type { LetterGrid, Language } from '@/shared/types/game';

const grid = [['A', 'B'], ['C', 'D']] as unknown as LetterGrid;

const base = {
  grid,
  language: 'en' as Language,
  score: 30,
  remainingTime: 42,
  isPaused: false,
  isGameOver: false,
  minWordLength: 3,
  bots: [{ name: 'WordBot', score: 50 }, { name: 'LexiBot', score: 10 }],
  playerName: 'You',
};

describe('toShellLeaderboard', () => {
  it('ranks the player among the bots by score, highest first', () => {
    const lb = toShellLeaderboard(base.bots, 'You', 30);
    expect(lb.map((e) => e.username)).toEqual(['WordBot', 'You', 'LexiBot']);
  });

  it('marks bots so the shell can tell them from the human', () => {
    const lb = toShellLeaderboard(base.bots, 'You', 30);
    expect(lb.find((e) => e.username === 'You')?.isBot).toBeUndefined();
    expect(lb.find((e) => e.username === 'WordBot')?.isBot).toBe(true);
  });

  it('handles a bot-less mode (practice / challenge)', () => {
    const lb = toShellLeaderboard([], 'You', 0);
    expect(lb).toEqual([{ username: 'You', score: 0 }]);
  });

  it('does not mistake a bot named like the player for the player', () => {
    const lb = toShellLeaderboard([{ name: 'You', score: 99 }], 'You', 1);
    expect(toPlayerRank(lb, 'You')).toBe(2);
  });
});

describe('toShellProps', () => {
  it('maps the core board and timer state', () => {
    const p = toShellProps(base);
    expect(p.letterGrid).toBe(grid);
    expect(p.playerScore).toBe(30);
    expect(p.remainingTime).toBe(42);
    expect(p.timerValue).toBe(42);
    expect(p.minWordLength).toBe(3);
    expect(p.gameLanguage).toBe('en');
  });

  it('reports the player rank against live bot scores', () => {
    expect(toShellProps(base).playerRank).toBe(2);
    expect(toShellProps({ ...base, score: 100 }).playerRank).toBe(1);
  });

  it('deactivates the board when paused', () => {
    const p = toShellProps({ ...base, isPaused: true });
    expect(p.gameActive).toBe(false);
    expect(p.isPlaying).toBe(false);
  });

  it('deactivates the board when the game is over', () => {
    const p = toShellProps({ ...base, isGameOver: true });
    expect(p.gameActive).toBe(false);
  });

  it('tolerates a null timer without emitting NaN', () => {
    const p = toShellProps({ ...base, remainingTime: null });
    expect(p.remainingTime).toBeNull();
    expect(p.timerValue).toBe(0);
    expect(Number.isNaN(p.timerValue)).toBe(false);
  });

  it('supplies solo-safe defaults for the room-shaped props', () => {
    const p = toShellProps(base);
    expect(p.gameCode).toBe('');
    expect(p.isHost).toBe(true);
    expect(p.tournamentData).toBeNull();
    expect(p.showStartAnimation).toBe(false);
  });
});
