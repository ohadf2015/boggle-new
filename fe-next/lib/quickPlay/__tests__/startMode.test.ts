import { describe, it, expect } from 'vitest';
import { parseQuickPlayStartMode, quickPlayHref } from '../startMode';

describe('parseQuickPlayStartMode', () => {
  it.each([
    ['classic', 'classic'],
    ['blast', 'blast'],
    ['word-hunt', 'word-hunt'],
    ['hunt', 'word-hunt'],
    ['wheel-rush', 'wheel-rush'],
    ['wheel', 'wheel-rush'],
    ['random', 'random'],
  ])('given ?mode=%s, then the hub starts %s', (param, expected) => {
    expect(parseQuickPlayStartMode(param)).toBe(expected);
  });

  it.each([null, '', 'tower', 'CLASSIC ', 'practice'])('given %j, then no auto-start', (param) => {
    expect(parseQuickPlayStartMode(param)).toBeNull();
  });
});

describe('quickPlayHref', () => {
  it('given a mode, then links straight into it', () => {
    expect(quickPlayHref('he', 'word-hunt')).toBe('/he/quick-play?mode=word-hunt');
    expect(quickPlayHref('en', 'random')).toBe('/en/quick-play?mode=random');
  });
});
