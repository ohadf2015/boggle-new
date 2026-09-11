/**
 * Unplugged reteach — whole-class game state machine (pure).
 *
 * Class-2 guard: every word boundary MUST route through the single
 * `advanceWord()` reset path, never through a per-outcome branch.
 */
import { describe, it, expect } from 'vitest';
import {
  UNPLUGGED_BASE_POINTS,
  UNPLUGGED_BEAT_CLOCK_BONUS,
  UNPLUGGED_HANDS_BONUS_CAP,
  UNPLUGGED_PRESETS_MS,
  UNPLUGGED_STREAK_STEP,
  advanceWord,
  bumpHands,
  createUnpluggedGame,
  currentWord,
  isPerfectRun,
  judgeWord,
  remainingMs,
  resetUnpluggedGame,
  revealWord,
  setDuration,
  startTimer,
} from '../unpluggedReteachGame';

const WORDS = ['neutron', 'quark', 'photon'];

describe('unpluggedReteachGame', () => {
  it('starts ready on word one with a zeroed scoreboard and a 30s default', () => {
    const s = createUnpluggedGame(WORDS);
    expect(s.phase).toBe('ready');
    expect(s.index).toBe(0);
    expect(currentWord(s)).toBe('neutron');
    expect(s.score).toBe(0);
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(0);
    expect(s.cleared).toBe(0);
    expect(s.durationMs).toBe(30_000);
    expect(UNPLUGGED_PRESETS_MS).toEqual([20_000, 30_000, 45_000]);
  });

  it('finishes immediately when there are no words', () => {
    expect(createUnpluggedGame([]).phase).toBe('finished');
  });

  it('only accepts preset durations and only while ready', () => {
    const s = setDuration(createUnpluggedGame(WORDS), 45_000);
    expect(s.durationMs).toBe(45_000);
    expect(setDuration(s, 7_000).durationMs).toBe(45_000);
    const running = startTimer(s, 1_000);
    expect(setDuration(running, 20_000).durationMs).toBe(45_000);
  });

  it('derives remaining time from a deadline, not a counter', () => {
    const s = startTimer(setDuration(createUnpluggedGame(WORDS), 20_000), 1_000);
    expect(s.phase).toBe('running');
    expect(s.deadline).toBe(21_000);
    expect(s.timerRan).toBe(true);
    expect(remainingMs(s, 6_000)).toBe(15_000);
    expect(remainingMs(s, 99_000)).toBe(0);
    expect(remainingMs(createUnpluggedGame(WORDS), 0)).toBe(20_000 + 10_000);
  });

  it('flags beat-the-clock only when the timer actually ran and time was left', () => {
    const started = startTimer(createUnpluggedGame(WORDS), 0);
    expect(revealWord(started, 5_000).beatTheClock).toBe(true);
    expect(revealWord(started, 30_000).beatTheClock).toBe(false);
    // revealing without ever starting the timer is not a beat-the-clock
    expect(revealWord(createUnpluggedGame(WORDS), 0).beatTheClock).toBe(false);
    expect(revealWord(started, 5_000).phase).toBe('revealed');
  });

  it('awards base + streak + beat-the-clock on GOT IT', () => {
    let s = revealWord(startTimer(createUnpluggedGame(WORDS), 0), 1_000);
    s = judgeWord(s, true);
    expect(s.score).toBe(
      UNPLUGGED_BASE_POINTS + UNPLUGGED_STREAK_STEP + UNPLUGGED_BEAT_CLOCK_BONUS,
    );
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(1);
    expect(s.cleared).toBe(1);
  });

  it('caps the show-of-hands bonus and clamps the stepper', () => {
    let s = revealWord(createUnpluggedGame(WORDS), 0);
    s = bumpHands(s, -3);
    expect(s.hands).toBe(0);
    s = bumpHands(s, 40);
    expect(s.hands).toBe(40);
    const judged = judgeWord(s, true);
    expect(judged.score).toBe(
      UNPLUGGED_BASE_POINTS + UNPLUGGED_STREAK_STEP + UNPLUGGED_HANDS_BONUS_CAP,
    );
  });

  it('resets the streak on NOT YET but keeps the best streak', () => {
    let s = createUnpluggedGame([...WORDS, 'boson']);
    s = judgeWord(revealWord(s, 0), true);
    s = judgeWord(revealWord(s, 0), true);
    expect(s.streak).toBe(2);
    const scoreBefore = s.score;
    s = judgeWord(revealWord(s, 0), false);
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(2);
    expect(s.score).toBe(scoreBefore);
    expect(s.missed).toBe(1);
  });

  it('routes every word boundary through one advanceWord reset', () => {
    const dirty = bumpHands(revealWord(startTimer(createUnpluggedGame(WORDS), 0), 1_000), 6);
    const got = judgeWord(dirty, true);
    const notYet = judgeWord(dirty, false);
    for (const next of [got, notYet, advanceWord(dirty)]) {
      expect(next.index).toBe(1);
      expect(next.phase).toBe('ready');
      expect(next.deadline).toBeNull();
      expect(next.timerRan).toBe(false);
      expect(next.beatTheClock).toBe(false);
      expect(next.hands).toBe(0);
    }
  });

  it('finishes after the last word and reports a perfect run', () => {
    let s = createUnpluggedGame(['a', 'b']);
    s = judgeWord(revealWord(s, 0), true);
    expect(s.phase).toBe('ready');
    s = judgeWord(revealWord(s, 0), true);
    expect(s.phase).toBe('finished');
    expect(s.cleared).toBe(2);
    expect(isPerfectRun(s)).toBe(true);
    expect(isPerfectRun(createUnpluggedGame(['a']))).toBe(false);
  });

  it('is not a perfect run when one word was missed', () => {
    let s = createUnpluggedGame(['a', 'b']);
    s = judgeWord(revealWord(s, 0), false);
    s = judgeWord(revealWord(s, 0), true);
    expect(s.phase).toBe('finished');
    expect(isPerfectRun(s)).toBe(false);
  });

  it('replays from scratch but keeps the chosen duration', () => {
    let s = setDuration(createUnpluggedGame(WORDS), 45_000);
    s = judgeWord(revealWord(startTimer(s, 0), 1_000), true);
    const again = resetUnpluggedGame(s);
    expect(again.index).toBe(0);
    expect(again.score).toBe(0);
    expect(again.bestStreak).toBe(0);
    expect(again.cleared).toBe(0);
    expect(again.phase).toBe('ready');
    expect(again.durationMs).toBe(45_000);
  });
});
