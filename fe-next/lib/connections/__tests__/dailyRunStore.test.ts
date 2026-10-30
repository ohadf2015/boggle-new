import { describe, it, expect, beforeEach } from 'vitest';
import { initGameState, applyGuess } from '../gameLogic';
import { dailyPuzzleSet, DAILY_ATTEMPTS_PER_PUZZLE } from '../daily';
import { clearDailyRun, loadDailyRun, saveDailyRun, restoreGameState } from '../dailyRunStore';

const DAY = '2026-09-08';

describe('dailyRunStore — an unfinished daily survives a reload', () => {
  beforeEach(() => window.localStorage.clear());

  it('restores the same puzzles, attempts and score', () => {
    const puzzles = dailyPuzzleSet(DAY, 'en');
    let state = initGameState(puzzles, { attemptsPerPuzzle: DAILY_ATTEMPTS_PER_PUZZLE });
    state = applyGuess({ ...state, input: 'definitely-wrong' }, 'definitely-wrong');
    state = { ...state, completedIds: new Set(['x']), hintRevealed: true };
    saveDailyRun(DAY, 'en', { state, solved: [], wrongByIndex: { 0: 1 }, outcomes: [], elapsedMs: 4200 });

    const run = loadDailyRun(DAY);
    expect(run).not.toBeNull();
    const restored = restoreGameState(run!);
    expect(restored).not.toBeNull();
    expect(restored!.puzzles.map((p) => p.id)).toEqual(puzzles.map((p) => p.id));
    expect(restored!.wrongAttempts).toBe(1);
    expect(restored!.hintRevealed).toBe(true);
    expect(restored!.completedIds).toEqual(new Set(['x']));
    expect(restored!.input).toBe('');
    expect(run!.elapsedMs).toBe(4200);
    expect(run!.wrongByIndex).toEqual({ 0: 1 });
  });

  it('is gone once cleared, and per day', () => {
    const state = initGameState(dailyPuzzleSet(DAY, 'en'));
    saveDailyRun(DAY, 'en', { state, solved: [], wrongByIndex: {}, outcomes: [], elapsedMs: 0 });
    expect(loadDailyRun('2026-09-09')).toBeNull();
    clearDailyRun(DAY);
    expect(loadDailyRun(DAY)).toBeNull();
  });

  it('a run whose puzzles left the pool starts fresh', () => {
    window.localStorage.setItem(
      'connections-daily-run-2026-09-08',
      JSON.stringify({ language: 'en', puzzleIds: ['gone'], state: { currentIndex: 0 } }),
    );
    const run = loadDailyRun(DAY);
    expect(run && restoreGameState(run)).toBeNull();
  });
});
