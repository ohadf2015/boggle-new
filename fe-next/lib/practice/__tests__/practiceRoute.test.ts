import { describe, it, expect } from 'vitest';
import {
  practiceTargetUrl,
  isValidPracticeMode,
  PRACTICE_MODES,
  getNextPracticeMode,
  nextPracticeUrl,
} from '../practiceRoute';

describe('practiceTargetUrl', () => {
  it('maps wordHunt to /daily/word-hunt with practice flag', () => {
    expect(practiceTargetUrl('wordHunt', 'he')).toBe('/he/daily/word-hunt?practice=1');
  });

  it('maps wheelRush to /daily/word-wheel with practice flag', () => {
    expect(practiceTargetUrl('wheelRush', 'es')).toBe('/es/daily/word-wheel?practice=1');
  });

  it('maps classic to /multiplayer (practice never funnels players into single-player mode)', () => {
    expect(practiceTargetUrl('classic', 'ja')).toBe('/ja/multiplayer');
  });

  it('never routes any practice mode into single-player mode', () => {
    PRACTICE_MODES.forEach((mode) => {
      expect(practiceTargetUrl(mode, 'en')).not.toContain('/singleplayer');
    });
  });

  it('preserves locale across all practice modes', () => {
    PRACTICE_MODES.forEach((mode) => {
      expect(practiceTargetUrl(mode, 'sv')).toMatch(/^\/sv\//);
    });
  });
});

describe('PRACTICE_MODES catalog', () => {
  it('excludes blast (bespoke tutorial out of scope)', () => {
    expect(PRACTICE_MODES).not.toContain('blast');
  });

  it('includes the three teachable modes', () => {
    expect(PRACTICE_MODES).toEqual(['classic', 'wordHunt', 'wheelRush']);
  });
});

describe('isValidPracticeMode', () => {
  it('accepts modes in the practice catalog', () => {
    expect(isValidPracticeMode('classic')).toBe(true);
    expect(isValidPracticeMode('wordHunt')).toBe(true);
    expect(isValidPracticeMode('wheelRush')).toBe(true);
  });

  it('rejects blast at the route layer (no practice tutorial yet)', () => {
    expect(isValidPracticeMode('blast')).toBe(false);
  });

  it('rejects unknown strings', () => {
    expect(isValidPracticeMode('blastoff')).toBe(false);
    expect(isValidPracticeMode('')).toBe(false);
    expect(isValidPracticeMode('word-hunt')).toBe(false);
  });
});

describe('getNextPracticeMode', () => {
  it('returns wordHunt after classic', () => {
    expect(getNextPracticeMode('classic')).toBe('wordHunt');
  });

  it('returns wheelRush after wordHunt', () => {
    expect(getNextPracticeMode('wordHunt')).toBe('wheelRush');
  });

  it('returns null after wheelRush (chain complete)', () => {
    expect(getNextPracticeMode('wheelRush')).toBeNull();
  });
});

describe('nextPracticeUrl — the chain CTA on daily results', () => {
  // PracticeChainCta still renders on WordWheelResults and DailyWordHuntResults.
  // It used to point at /practice/<mode>, which now only exists as a 301, so the
  // player took a redirect hop to reach a game we could have linked directly.
  it('links straight at the real mode, never at a retired /practice url', () => {
    expect(nextPracticeUrl('classic', 'he')).toBe('/he/daily/word-hunt?practice=1');
    expect(nextPracticeUrl('wordHunt', 'es')).toBe('/es/daily/word-wheel?practice=1');
    for (const mode of ['classic', 'wordHunt', 'wheelRush'] as const) {
      expect(nextPracticeUrl(mode, 'en')).not.toContain('/practice/');
    }
  });

  it('ends the chain on the home hub, not the retired practice hub', () => {
    expect(nextPracticeUrl('wheelRush', 'sv')).toBe('/sv');
    expect(nextPracticeUrl('wheelRush', 'en')).not.toContain('practice');
  });
});
