import { describe, it, expect } from 'vitest';
import { practiceTargetUrl, isValidPracticeMode, PRACTICE_MODES } from '../practiceRoute';

describe('practiceTargetUrl', () => {
  it('maps wordHunt to /daily/word-hunt with practice flag', () => {
    expect(practiceTargetUrl('wordHunt', 'he')).toBe('/he/daily/word-hunt?practice=1');
  });

  it('maps wheelRush to /daily/word-wheel with practice flag', () => {
    expect(practiceTargetUrl('wheelRush', 'es')).toBe('/es/daily/word-wheel?practice=1');
  });

  it('maps classic to /singleplayer with practice flag', () => {
    expect(practiceTargetUrl('classic', 'ja')).toBe('/ja/singleplayer?practice=1');
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
