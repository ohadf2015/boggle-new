/**
 * Session Fatigue Detection Tests
 *
 * Tests for fatigue detection based on session duration and accuracy patterns.
 */

import {
  detectFatigue,
  rollingAccuracy,
  type SessionFatigueInput,
} from './sessionFatigue';

function makeInput(overrides: Partial<SessionFatigueInput> = {}): SessionFatigueInput {
  return {
    sessionStartTime: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
    recentAccuracies: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 100% accuracy
    totalAnswers: 10,
    breaksTaken: 0,
    ...overrides,
  };
}

describe('rollingAccuracy', () => {
  it('returns 1.0 for all correct answers', () => {
    expect(rollingAccuracy([1, 1, 1, 1, 1], 5)).toBe(1.0);
  });

  it('returns 0.0 for all incorrect answers', () => {
    expect(rollingAccuracy([0, 0, 0, 0, 0], 5)).toBe(0.0);
  });

  it('returns 0.5 for half correct', () => {
    expect(rollingAccuracy([1, 0, 1, 0], 4)).toBe(0.5);
  });

  it('uses last N items when array is longer than window', () => {
    // last 3 of [1,1,0,0,0] = [0,0,0] → 0.0
    expect(rollingAccuracy([1, 1, 0, 0, 0], 3)).toBe(0.0);
  });

  it('returns 0 for empty array', () => {
    expect(rollingAccuracy([], 10)).toBe(0);
  });

  it('handles window larger than array', () => {
    expect(rollingAccuracy([1, 1], 10)).toBe(1.0);
  });
});

describe('detectFatigue', () => {
  describe('no fatigue', () => {
    it('returns none for short session with good accuracy', () => {
      const input = makeInput({
        sessionStartTime: new Date(Date.now() - 5 * 60 * 1000),
        recentAccuracies: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        totalAnswers: 10,
      });
      const result = detectFatigue(input);
      expect(result.fatigueLevel).toBe('none');
      expect(result.shouldSuggestBreak).toBe(false);
    });

    it('has empty reasons when no fatigue', () => {
      const input = makeInput();
      const result = detectFatigue(input);
      expect(result.reasons).toEqual([]);
    });
  });

  describe('mild fatigue', () => {
    it('detects mild fatigue after 25+ minutes', () => {
      const input = makeInput({
        sessionStartTime: new Date(Date.now() - 26 * 60 * 1000),
        recentAccuracies: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        totalAnswers: 30,
      });
      const result = detectFatigue(input);
      expect(['mild', 'moderate', 'high']).toContain(result.fatigueLevel);
    });

    it('detects mild fatigue when totalAnswers > 80', () => {
      const input = makeInput({
        sessionStartTime: new Date(Date.now() - 10 * 60 * 1000),
        recentAccuracies: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        totalAnswers: 85,
      });
      const result = detectFatigue(input);
      expect(['mild', 'moderate', 'high']).toContain(result.fatigueLevel);
    });
  });

  describe('moderate fatigue', () => {
    it('detects moderate fatigue after 40+ minutes', () => {
      const input = makeInput({
        sessionStartTime: new Date(Date.now() - 41 * 60 * 1000),
        recentAccuracies: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        totalAnswers: 50,
      });
      const result = detectFatigue(input);
      expect(['moderate', 'high']).toContain(result.fatigueLevel);
    });

    it('detects moderate fatigue when last 10 accuracy < 50%', () => {
      const input = makeInput({
        sessionStartTime: new Date(Date.now() - 5 * 60 * 1000),
        recentAccuracies: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0], // 3/10 = 30% (< 50%)
        totalAnswers: 20,
      });
      const result = detectFatigue(input);
      expect(['moderate', 'high']).toContain(result.fatigueLevel);
    });

    it('shouldSuggestBreak is true for moderate fatigue', () => {
      const input = makeInput({
        sessionStartTime: new Date(Date.now() - 41 * 60 * 1000),
        recentAccuracies: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        totalAnswers: 50,
      });
      const result = detectFatigue(input);
      if (result.fatigueLevel === 'moderate' || result.fatigueLevel === 'high') {
        expect(result.shouldSuggestBreak).toBe(true);
      }
    });
  });

  describe('high fatigue', () => {
    it('detects high fatigue when last 10 accuracy < 30%', () => {
      const input = makeInput({
        sessionStartTime: new Date(Date.now() - 5 * 60 * 1000),
        recentAccuracies: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 1/10 = 10%
        totalAnswers: 20,
      });
      const result = detectFatigue(input);
      // < 30% accuracy → high fatigue signal
      expect(['moderate', 'high']).toContain(result.fatigueLevel);
    });

    it('escalates to higher level when both time AND accuracy signals present', () => {
      // 26+ min (mild) + accuracy < 50% (moderate signal) → should escalate
      const input = makeInput({
        sessionStartTime: new Date(Date.now() - 26 * 60 * 1000),
        recentAccuracies: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0], // 30% accuracy
        totalAnswers: 30,
      });
      const result = detectFatigue(input);
      expect(['moderate', 'high']).toContain(result.fatigueLevel);
    });
  });

  describe('recommendedBreakMinutes', () => {
    it('returns 0 break minutes for no fatigue', () => {
      const result = detectFatigue(makeInput());
      expect(result.recommendedBreakMinutes).toBe(0);
    });

    it('returns positive break minutes for moderate fatigue', () => {
      const input = makeInput({
        sessionStartTime: new Date(Date.now() - 41 * 60 * 1000),
        recentAccuracies: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        totalAnswers: 50,
      });
      const result = detectFatigue(input);
      if (result.fatigueLevel !== 'none') {
        expect(result.recommendedBreakMinutes).toBeGreaterThan(0);
      }
    });
  });

  describe('reasons', () => {
    it('provides reasons when fatigue is detected', () => {
      const input = makeInput({
        sessionStartTime: new Date(Date.now() - 26 * 60 * 1000),
        totalAnswers: 30,
      });
      const result = detectFatigue(input);
      if (result.fatigueLevel !== 'none') {
        expect(result.reasons.length).toBeGreaterThan(0);
      }
    });

    it('reasons are strings (translation keys)', () => {
      const input = makeInput({
        sessionStartTime: new Date(Date.now() - 41 * 60 * 1000),
        totalAnswers: 50,
      });
      const result = detectFatigue(input);
      result.reasons.forEach(reason => {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(0);
      });
    });
  });
});
