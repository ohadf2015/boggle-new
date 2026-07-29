import { describe, it, expect } from 'vitest';
import { shouldRequestReview, type ReviewState } from '../shouldRequestReview';

describe('shouldRequestReview', () => {
  const baseState: ReviewState = {
    positiveMoments: 0,
    lastPromptedAt: null,
    promptedVersions: [],
  };

  const now = 1000000000000; // Fixed timestamp
  const appVersion = '1.0.0';

  describe('RED: Minimum engagement gate', () => {
    it('should return false if positiveMoments below threshold', () => {
      const state: ReviewState = {
        positiveMoments: 2, // Below default threshold of 3
        lastPromptedAt: null,
        promptedVersions: [],
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(false);
    });

    it('should return true if positiveMoments meets threshold (3)', () => {
      const state: ReviewState = {
        positiveMoments: 3,
        lastPromptedAt: null,
        promptedVersions: [],
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(true);
    });

    it('should return true if positiveMoments exceeds threshold', () => {
      const state: ReviewState = {
        positiveMoments: 5,
        lastPromptedAt: null,
        promptedVersions: [],
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(true);
    });
  });

  describe('RED: Version-based gating', () => {
    it('should return false if already prompted in this version', () => {
      const state: ReviewState = {
        positiveMoments: 3,
        lastPromptedAt: null,
        promptedVersions: [appVersion],
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(false);
    });

    it('should return true if prompted in different version and enough time passed', () => {
      const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;
      const state: ReviewState = {
        positiveMoments: 3,
        lastPromptedAt: sixtyDaysAgo,
        promptedVersions: ['0.9.0'],
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(true);
    });

    it('should return false if different version but within cooldown', () => {
      const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;
      const state: ReviewState = {
        positiveMoments: 3,
        lastPromptedAt: oneDayAgo,
        promptedVersions: ['0.9.0'], // Different version but within cooldown
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(false);
    });
  });

  describe('RED: Cooldown period (60 days)', () => {
    it('should return false if prompted within 60 days', () => {
      const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;
      const state: ReviewState = {
        positiveMoments: 3,
        lastPromptedAt: oneDayAgo,
        promptedVersions: [appVersion],
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(false);
    });

    it('should return false if prompted exactly 59 days ago', () => {
      const fiftyNineDaysAgo = now - 59 * 24 * 60 * 60 * 1000;
      const state: ReviewState = {
        positiveMoments: 3,
        lastPromptedAt: fiftyNineDaysAgo,
        promptedVersions: [appVersion],
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(false);
    });

    it('should return false if prompted exactly 60 days ago in same version (version gating takes priority)', () => {
      const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;
      const state: ReviewState = {
        positiveMoments: 3,
        lastPromptedAt: sixtyDaysAgo,
        promptedVersions: [appVersion], // Already in this version's history
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(false);
    });

    it('should return true if prompted more than 60 days ago in different version', () => {
      const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
      const state: ReviewState = {
        positiveMoments: 3,
        lastPromptedAt: ninetyDaysAgo,
        promptedVersions: ['0.9.0'], // Different version
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(true);
    });
  });

  describe('RED: Trigger validation', () => {
    it('should only accept valid triggers', () => {
      const state: ReviewState = {
        positiveMoments: 3,
        lastPromptedAt: null,
        promptedVersions: [],
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(true);
      expect(shouldRequestReview(state, now, appVersion, 'dailyStreak')).toBe(true);
      expect(shouldRequestReview(state, now, appVersion, 'levelComplete')).toBe(true);
    });
  });

  describe('GREEN: Happy path', () => {
    it('should return true with sufficient engagement, no history, valid trigger', () => {
      const state: ReviewState = {
        positiveMoments: 3,
        lastPromptedAt: null,
        promptedVersions: [],
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(true);
    });

    it('should accumulate positive moments across calls', () => {
      let state: ReviewState = baseState;
      // After 3 wins, should be ready
      state = { ...state, positiveMoments: 3 };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(true);
    });
  });

  describe('REFACTOR: Edge cases', () => {
    it('should handle null lastPromptedAt gracefully', () => {
      const state: ReviewState = {
        positiveMoments: 3,
        lastPromptedAt: null,
        promptedVersions: [],
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(true);
    });

    it('should handle empty promptedVersions array', () => {
      const state: ReviewState = {
        positiveMoments: 3,
        lastPromptedAt: null,
        promptedVersions: [],
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(true);
    });

    it('should handle multiple versions in promptedVersions', () => {
      const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;
      const state: ReviewState = {
        positiveMoments: 3,
        lastPromptedAt: sixtyDaysAgo,
        promptedVersions: ['0.8.0', '0.9.0', '1.0.0'], // Already prompted in 1.0.0
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(false);
    });

    it('should block re-prompts in same version indefinitely (version gating)', () => {
      const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
      const state: ReviewState = {
        positiveMoments: 3,
        lastPromptedAt: ninetyDaysAgo,
        promptedVersions: [appVersion], // Already in this version
      };
      expect(shouldRequestReview(state, now, appVersion, 'gameWin')).toBe(false);
    });
  });
});
