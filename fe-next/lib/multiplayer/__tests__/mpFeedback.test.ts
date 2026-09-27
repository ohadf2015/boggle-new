import { describe, it, expect, beforeEach } from 'vitest';
import { useMpFeedbackStore, recordWordAccepted, recordWordRejected, resetMpFeedback, acceptedPoints } from '../mpFeedback';
import { scoreAcceptedWord } from '@/backend/modules/wordScore';

/**
 * One feedback channel for both word-event hooks (player + host-playing). The
 * HUD score chip, floaters and callouts read it, so a word accepted on either
 * path produces the same juice (pitfall class 3).
 */
describe('mpFeedback store', () => {
  beforeEach(() => resetMpFeedback());

  it('records an accepted word with the server points and a fresh id each time', () => {
    recordWordAccepted({ word: 'cat', score: 7, comboLevel: 2 });
    const first = useMpFeedbackStore.getState().lastWord;
    expect(first).toMatchObject({ word: 'cat', points: 7, comboLevel: 2 });
    recordWordAccepted({ word: 'cat', score: 7, comboLevel: 2 });
    const second = useMpFeedbackStore.getState().lastWord;
    expect(second?.id).not.toBe(first?.id);
  });

  it('records a rejection with its reason, separately from the last accepted word', () => {
    recordWordAccepted({ word: 'dog', score: 3, comboLevel: 0 });
    recordWordRejected('zz', 'not-on-board');
    const s = useMpFeedbackStore.getState();
    expect(s.lastWord?.word).toBe('dog');
    expect(s.lastReject).toMatchObject({ word: 'zz', reason: 'not-on-board' });
  });

  it('records found-by-other with who got it and the confirmation points', () => {
    recordWordRejected('sun', 'found-by-other', { foundBy: 'Ana', points: 2 });
    expect(useMpFeedbackStore.getState().lastReject).toMatchObject({ word: 'sun', foundBy: 'Ana', points: 2 });
  });

  it('reset clears both lanes (new round)', () => {
    recordWordAccepted({ word: 'dog', score: 3, comboLevel: 0 });
    recordWordRejected('zz', 'invalid');
    resetMpFeedback();
    expect(useMpFeedbackStore.getState()).toMatchObject({ lastWord: null, lastReject: null });
  });
});

/**
 * Displayed points are ALWAYS the server's `wordAccepted.score`. Verified
 * against the backend 2026-09-26: `score` is `scoreAcceptedWord().total`, which
 * already includes the combo multiplier; `comboBonus` is informational only.
 * Adding it again would double-count (the OPEN client/server divergence).
 */
describe('acceptedPoints — server score is the source of truth', () => {
  it('uses data.score and never adds comboBonus on top', () => {
    expect(acceptedPoints({ score: 12, comboBonus: 4 })).toBe(12);
    expect(acceptedPoints({ score: 0 })).toBe(0);
    expect(acceptedPoints({} as { score: number })).toBe(0);
  });

  it('the backend total already contains the combo (pin of the payload contract)', () => {
    const plain = scoreAcceptedWord({ word: 'planet', comboLevel: 0 });
    const combo = scoreAcceptedWord({ word: 'planet', comboLevel: 4 });
    expect(combo.comboBonus).toBeGreaterThan(0);
    expect(combo.total).toBeGreaterThan(plain.total);
    // total = base + comboBonus (outside Blast / fire round) — the combo is IN the score.
    expect(combo.total).toBe(combo.baseScore + combo.comboBonus);
    expect(plain.total).toBe(plain.baseScore + plain.comboBonus);
  });
});
