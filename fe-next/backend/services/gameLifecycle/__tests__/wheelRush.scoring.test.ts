/**
 * Wheel Rush Scoring Regression Test
 *
 * Verifies that wheel-rush submissions update scores for both humans and bots.
 * Regression test for: Bug 2 — scoring deadlocked at 0 for both bots and humans
 * in round 1.
 *
 * Root cause was wheelRushState not being initialized if getGame() returned null
 * during async setup, causing both handler paths to reject with
 * WHEEL_STATE_NOT_INITIALIZED.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../utils/logger', () => ({ default: {
  info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
} }));

const mocks = vi.hoisted(() => ({
  updatePlayerScore: vi.fn(),
  addPlayerWord: vi.fn(),
  getLeaderboardThrottled: vi.fn(),
  broadcastToRoom: vi.fn(),
  getCachedTrie: vi.fn(),
  ensureLanguageLoaded: vi.fn(async () => {}),
}));

vi.mock('../../../modules/gameStateManager', () => ({
  updatePlayerScore: mocks.updatePlayerScore,
  addPlayerWord: mocks.addPlayerWord,
  getLeaderboard: () => [],
  getLeaderboardThrottled: mocks.getLeaderboardThrottled,
}));
vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: mocks.broadcastToRoom,
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: (code: string) => `room:${code}`,
}));
vi.mock('../../../modules/boggleSolver', () => ({
  getCachedTrie: mocks.getCachedTrie,
}));
vi.mock('../../../dictionary', () => ({
  ensureLanguageLoaded: mocks.ensureLanguageLoaded,
}));

import { validateWheelSubmission, applyWheelWord, initWheelRushState } from '../../../modules/wheelRushManager';
import { WHEEL_RUSH_MIN_WORD_LEN } from '@/shared/constants/wheelRushConstants';
import type { WheelRushModeState, WheelPuzzle } from '@/shared/types/game';

describe('Wheel Rush Scoring Regression', () => {
  let wheelState: WheelRushModeState;
  let puzzle: WheelPuzzle;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create a simple wheel puzzle: center 'A', outer 'B', 'C', 'D'
    puzzle = {
      centerLetter: 'A',
      outerLetters: ['B', 'C', 'D'],
      allLetters: ['A', 'B', 'C', 'D'],
    };

    // Initialize wheel-rush state for 2 players (1 human + 1 bot)
    wheelState = initWheelRushState(puzzle, ['Alice', 'BotBob']);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should apply scoring to human submission (core bug: wheelRushState must be initialized)', () => {
    // Precondition: wheelRushState must be initialized (not null/undefined)
    expect(wheelState).toBeDefined();
    expect(wheelState.playerStats).toBeDefined();
    expect(wheelState.foundWords).toBeDefined();

    // Apply a word directly (bypassing dictionary validation which requires a loaded trie)
    // Focus: when wheelRushState exists, applyWheelWord must produce a non-zero score
    const word = 'CAB';  // Hypothetical valid word (center A + C, B)
    const outcome = applyWheelWord(wheelState, 'Alice', word, Date.now());

    // CRITICAL: outcome.score must NOT be 0 (bug symptom: both human and bot stuck at 0)
    expect(outcome.score).toBeGreaterThan(0);
    expect(outcome.firstFinder).toBe(true);

    // Verify the state tracked the word
    expect(wheelState.foundWords['Alice']).toContain(word);
  });

  it('should apply scoring to bot submission (core bug: wheelRushState must be initialized)', () => {
    // Precondition: wheelRushState must be initialized
    expect(wheelState).toBeDefined();

    // Apply a word directly (bypassing dictionary validation)
    const word = 'BAD';  // Hypothetical valid word (center A + B, D)
    const outcome = applyWheelWord(wheelState, 'BotBob', word, Date.now());

    // CRITICAL: outcome.score must NOT be 0 (this was the bug symptom)
    expect(outcome.score).toBeGreaterThan(0);

    // Verify the state tracked the word
    expect(wheelState.foundWords['BotBob']).toContain(word);
  });

  it('should reject words missing the center letter', () => {
    const word = 'BCD'; // No center 'A'
    const validation = validateWheelSubmission(wheelState, word, 'en');
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('no-center');
  });

  it('should reject words below minimum length', () => {
    const word = 'AB'; // Only 2 letters, min is WHEEL_RUSH_MIN_WORD_LEN (3)
    const validation = validateWheelSubmission(wheelState, word, 'en');
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('too-short');
  });

  it('should apply reduced score for repeat submissions (parallel discovery model)', () => {
    const word = 'CAB';

    // First submission by Alice
    const outcome1 = applyWheelWord(wheelState, 'Alice', word, Date.now());
    const firstScore = outcome1.score;
    expect(firstScore).toBeGreaterThan(0);
    expect(outcome1.firstFinder).toBe(true);
    expect(outcome1.repeat).toBe(false); // First time, not a repeat

    // Second submission of same word by Alice (repeat for same player)
    // Under parallel discovery model, repeats score at reduced rate (REPEAT_SCORE_FACTOR)
    const outcome2 = applyWheelWord(wheelState, 'Alice', word, Date.now() + 100);
    const repeatScore = outcome2.score;
    expect(repeatScore).toBeGreaterThan(0); // Still scores > 0, just reduced
    expect(repeatScore).toBeLessThan(firstScore); // Reduced due to repeat
    expect(outcome2.repeat).toBe(true); // Second time same player submits it
  });

  it('wheelRushState must exist for scoring to work (bug regression)', () => {
    // The bug was: if wheelRushState was null/undefined, BOTH handlers would reject
    // with WHEEL_STATE_NOT_INITIALIZED, leaving all players at score 0.
    // This test ensures the state object is properly initialized.

    const newState = initWheelRushState(puzzle, ['Alice', 'BotBob', 'Eve']);

    // State must have playerStats for each player (used in scoring)
    expect(newState.playerStats).toBeDefined();
    expect(newState.playerStats['Alice']).toBeDefined();
    expect(newState.playerStats['BotBob']).toBeDefined();
    expect(newState.playerStats['Eve']).toBeDefined();

    // foundWords must be initialized (tracks submissions)
    expect(newState.foundWords).toBeDefined();
    expect(newState.foundWords['Alice']).toBeInstanceOf(Array);
    expect(newState.foundWords['BotBob']).toBeInstanceOf(Array);
    expect(newState.foundWords['Eve']).toBeInstanceOf(Array);
  });
});
