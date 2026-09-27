/**
 * MP Word Hunt target no-repeat: selection must skip recently-served targets
 * (an `exclude` set) and the manager keeps a bounded recent-targets LRU per
 * language so the same word isn't the target two games running.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  selectTargetWord,
  selectTargetWordWithFallback,
  recordMpTarget,
  getRecentMpTargets,
  __resetMpTargetsForTest,
} from '../wordHuntManager';

describe('MP target no-repeat', () => {
  beforeEach(() => __resetMpTargetsForTest());

  describe('selectTargetWord with exclude', () => {
    it('never returns an excluded word', () => {
      const words = ['planet', 'rocket', 'garden'];
      const exclude = new Set(['planet', 'rocket']);
      for (let i = 0; i < 20; i++) {
        const r = selectTargetWord(words, 5, 8, false, 'en', exclude);
        expect(r).toBe('garden'); // only non-excluded candidate
      }
    });

    it('excludes case-insensitively', () => {
      const r = selectTargetWord(['PLANET', 'garden'], 5, 8, false, 'en', new Set(['planet']));
      expect(r).toBe('garden');
    });

    it('returns null when every candidate is excluded (caller regenerates grid)', () => {
      const r = selectTargetWord(['planet', 'rocket'], 5, 8, false, 'en', new Set(['planet', 'rocket']));
      expect(r).toBeNull();
    });
  });

  describe('selectTargetWordWithFallback with exclude', () => {
    it('skips recently-used words across the whole fallback chain', () => {
      const words = ['planet', 'rocket', 'garden'];
      const exclude = new Set(['planet', 'rocket']);
      for (let i = 0; i < 20; i++) {
        const r = selectTargetWordWithFallback(words, 5, 8, 'en', exclude);
        expect(r).toBe('garden');
      }
    });
  });

  describe('recent-targets LRU', () => {
    it('records and reports recent targets per language', () => {
      recordMpTarget('en', 'planet');
      recordMpTarget('en', 'rocket');
      recordMpTarget('he', 'shalom');
      expect(getRecentMpTargets('en')).toEqual(new Set(['planet', 'rocket']));
      expect(getRecentMpTargets('he')).toEqual(new Set(['shalom']));
    });

    it('stores lowercased so exclude matching is case-insensitive', () => {
      recordMpTarget('en', 'PLANET');
      expect(getRecentMpTargets('en').has('planet')).toBe(true);
    });

    it('caps the history so it cannot grow unbounded (drops oldest)', () => {
      for (let i = 0; i < 250; i++) recordMpTarget('en', `word${i}`);
      const recent = getRecentMpTargets('en');
      expect(recent.size).toBeLessThanOrEqual(200);
      expect(recent.has('word249')).toBe(true); // newest kept
      expect(recent.has('word0')).toBe(false); // oldest evicted
    });

    it('round-trips through selection: a recorded target is then excluded', () => {
      recordMpTarget('en', 'planet');
      const words = ['planet', 'garden'];
      const r = selectTargetWordWithFallback(words, 5, 8, 'en', getRecentMpTargets('en'));
      expect(r).toBe('garden');
    });
  });
});
