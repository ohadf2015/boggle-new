/**
 * buildRoundPayload — the one startGame-shaped payload. Kind-specific switches
 * only; everything else is shared (see mpResumePayload integration test for the
 * cross-door parity through real sockets).
 */
import { vi, describe, it, expect } from 'vitest';

vi.mock('../../modules/gameStateManager', () => ({
  getLeaderboard: vi.fn(() => [{ username: 'ann', score: 7 }]),
}));
vi.mock('../../services/vocabQuizShell', () => ({ quizShellStartFor: vi.fn(() => ({})) }));

import { buildRoundPayload } from '../roundPayload';

const game = {
  letterGrid: [['A']], timerSeconds: 90, remainingTime: 42, language: 'en', minWordLength: 3,
  gameSessionId: 4, boardTheme: null, gameMode: 'classic', goldenLetters: [],
  playerWords: { ann: ['cat'] }, isPaused: false,
} as any;

describe('buildRoundPayload', () => {
  it('fresh start: full timer, goldenLetters always present (even []), no resume fields', () => {
    const p = buildRoundPayload('G', game, { kind: 'start', messageId: 'm1' });
    expect(p).toMatchObject({ timerSeconds: 90, messageId: 'm1', goldenLetters: [], gameMode: 'classic' });
    expect(p).not.toHaveProperty('leaderboard');
    expect(p).not.toHaveProperty('reconnect');
  });

  it('retry = start + retry flag, keeping the round extras (classroom fields)', () => {
    const p = buildRoundPayload('G', game, { kind: 'retry', username: 'ann', messageId: 'm1', extras: { accessibility: { largeText: true } } });
    expect(p).toMatchObject({ retry: true, accessibility: { largeText: true }, timerSeconds: 90 });
  });

  it('reconnect: remaining time, leaderboard, own words, skipAck; goldenLetters omitted when empty', () => {
    const p = buildRoundPayload('G', game, { kind: 'reconnect', username: 'ann' });
    expect(p).toMatchObject({
      reconnect: true, skipAck: true, timerSeconds: 42, remainingTime: 42,
      myFoundWords: ['cat'], leaderboard: [{ username: 'ann', score: 7 }], isPaused: false,
    });
    expect(p).not.toHaveProperty('goldenLetters');
    expect(String(p.messageId)).toMatch(/^reconnect-/);
  });

  it('late join is flagged lateJoin (not reconnect) and has an empty word list', () => {
    const p = buildRoundPayload('G', game, { kind: 'lateJoin', username: 'newbie' });
    expect(p.lateJoin).toBe(true);
    expect(p).not.toHaveProperty('reconnect');
    expect(p.myFoundWords).toEqual([]);
  });
});
