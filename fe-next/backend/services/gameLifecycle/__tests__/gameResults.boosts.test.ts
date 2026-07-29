import { describe, it, expect, beforeEach } from 'vitest';
import { applyBoostsToScores } from '../gameResults';
import { signBoostToken } from '../../../utils/boostToken';

beforeEach(() => {
  process.env.BOOST_TOKEN_SECRET = 'test-secret';
});

describe('applyBoostsToScores', () => {
  it('returns scores unchanged when no boost token', () => {
    const scores = [{ username: 'a', totalScore: 100, wordDetails: [{ word: 'cat', score: 10, ts: 1000 }] }] as never;
    const out = applyBoostsToScores(scores, {}, 0);
    expect(out[0].totalScore).toBe(100);
  });

  it('applies firstWordBonus 2x to first word for player with valid token', () => {
    const sessionId = 'sess-mp-1';
    const token = signBoostToken(sessionId, 'firstWordBonus');
    const scores = [{
      username: 'a', totalScore: 30,
      wordDetails: [{ word: 'cat', score: 10, ts: 1000 }, { word: 'dog', score: 20, ts: 2000 }],
    }] as never;
    const out = applyBoostsToScores(scores, { a: { sessionId, token } }, 0);
    expect(out[0].wordDetails[0].score).toBe(20);
    expect(out[0].wordDetails[1].score).toBe(20);
    expect(out[0].totalScore).toBe(40);
  });

  it('ignores token with mismatched sessionId', () => {
    const token = signBoostToken('other-sess', 'firstWordBonus');
    const scores = [{ username: 'a', totalScore: 10, wordDetails: [{ word: 'cat', score: 10, ts: 1000 }] }] as never;
    const out = applyBoostsToScores(scores, { a: { sessionId: 'sess-mp-1', token } }, 0);
    expect(out[0].totalScore).toBe(10);
  });

  it('only applies to specified player, others unchanged', () => {
    const token = signBoostToken('s1', 'firstWordBonus');
    const scores = [
      { username: 'a', totalScore: 10, wordDetails: [{ word: 'cat', score: 10, ts: 1000 }] },
      { username: 'b', totalScore: 10, wordDetails: [{ word: 'dog', score: 10, ts: 1000 }] },
    ] as never;
    const out = applyBoostsToScores(scores, { a: { sessionId: 's1', token } }, 0);
    expect(out[0].totalScore).toBe(20);
    expect(out[1].totalScore).toBe(10);
  });

  describe('scoreMultiplier (v2 server-apply)', () => {
    it('applies 1.5x multiplier to words submitted within 30s of game start', () => {
      const token = signBoostToken('s1', 'scoreMultiplier');
      const gameStartTs = 100_000;
      // SCORE_MULT_WINDOW_SEC = 30s, so cutoff is gameStartTs + 30000.
      // Word at ts=110_000 is within window (10s after start).
      const scores = [{
        username: 'a',
        totalScore: 10,
        wordDetails: [{ word: 'cat', score: 10, ts: 110_000 }],
      }] as never;

      const out = applyBoostsToScores(scores, { a: { sessionId: 's1', token } }, gameStartTs);
      expect(out[0].wordDetails[0].score).toBe(15); // 10 * 1.5
      expect(out[0].totalScore).toBe(15);
    });

    it('does NOT apply multiplier to words submitted after the 30s window', () => {
      const token = signBoostToken('s1', 'scoreMultiplier');
      const gameStartTs = 100_000;
      // Word at ts=140_000 is outside window (40s after start, cutoff at 30s).
      const scores = [{
        username: 'a',
        totalScore: 10,
        wordDetails: [{ word: 'cat', score: 10, ts: 140_000 }],
      }] as never;

      const out = applyBoostsToScores(scores, { a: { sessionId: 's1', token } }, gameStartTs);
      expect(out[0].wordDetails[0].score).toBe(10);
      expect(out[0].totalScore).toBe(10);
    });

    it('fails closed when no word timestamps are present (no exploit grant)', () => {
      // Without timestamps the cutoff comparison would treat all ts=0 as "before
      // start" and grant the multiplier to every word — the v1 deferral was
      // exactly to avoid this. Server now refuses to apply when ts is absent.
      const token = signBoostToken('s1', 'scoreMultiplier');
      const gameStartTs = 100_000;
      const scores = [{
        username: 'a',
        totalScore: 10,
        wordDetails: [{ word: 'cat', score: 10 /* no ts */ }],
      }] as never;

      const out = applyBoostsToScores(scores, { a: { sessionId: 's1', token } }, gameStartTs);
      expect(out[0].wordDetails[0].score).toBe(10);
      expect(out[0].totalScore).toBe(10);
    });
  });
});
