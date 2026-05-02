import { describe, it, expect } from 'vitest';
import { practiceTargetUrl, isValidPracticeMode, PRACTICE_MODES } from '../practiceRoute';

describe('practiceTargetUrl', () => {
  it('maps blast to /blast with practice flag', () => {
    expect(practiceTargetUrl('blast', 'en')).toBe('/en/blast?practice=1');
  });

  it('maps wordHunt to /daily/word-hunt with practice flag', () => {
    expect(practiceTargetUrl('wordHunt', 'he')).toBe('/he/daily/word-hunt?practice=1');
  });

  it('maps wheelRush to /daily/word-wheel with practice flag', () => {
    expect(practiceTargetUrl('wheelRush', 'es')).toBe('/es/daily/word-wheel?practice=1');
  });

  it('maps classic to /singleplayer with practice flag', () => {
    expect(practiceTargetUrl('classic', 'ja')).toBe('/ja/singleplayer?practice=1');
  });

  it('preserves locale across all modes', () => {
    PRACTICE_MODES.forEach((mode) => {
      expect(practiceTargetUrl(mode, 'sv')).toMatch(/^\/sv\//);
    });
  });
});

describe('isValidPracticeMode', () => {
  it('accepts canonical mode keys', () => {
    expect(isValidPracticeMode('blast')).toBe(true);
    expect(isValidPracticeMode('classic')).toBe(true);
    expect(isValidPracticeMode('wordHunt')).toBe(true);
    expect(isValidPracticeMode('wheelRush')).toBe(true);
  });

  it('rejects unknown strings', () => {
    expect(isValidPracticeMode('blastoff')).toBe(false);
    expect(isValidPracticeMode('')).toBe(false);
    expect(isValidPracticeMode('word-hunt')).toBe(false); // hyphenated form not supported
  });
});
