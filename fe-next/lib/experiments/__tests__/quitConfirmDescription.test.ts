import { describe, it, expect } from 'vitest';
import { resolveQuitConfirmDescription } from '../quitConfirmDescription';

const input = {
  baseMessage: "You'll lose progress. Sure?",
  statsTemplate: 'You found {wordCount} words ({score} pts) — quit anyway?',
  score: 280,
  wordCount: 12,
};

describe('resolveQuitConfirmDescription', () => {
  it('control → returns the base message verbatim (no stats)', () => {
    expect(resolveQuitConfirmDescription('control', input)).toBe("You'll lose progress. Sure?");
  });

  it('stats-shown → interpolates word count + score into the template', () => {
    expect(resolveQuitConfirmDescription('stats-shown', input)).toBe(
      'You found 12 words (280 pts) — quit anyway?',
    );
  });

  it('stats-shown with zero progress → still interpolates (0 words, 0 pts)', () => {
    expect(
      resolveQuitConfirmDescription('stats-shown', { ...input, score: 0, wordCount: 0 }),
    ).toBe('You found 0 words (0 pts) — quit anyway?');
  });

  it('any non-stats-shown variant value falls back to base (safe default)', () => {
    // @ts-expect-error — guard against an unexpected variant string at runtime
    expect(resolveQuitConfirmDescription('unknown', input)).toBe(input.baseMessage);
  });

  it('undefined messages (missing key) coalesce to empty string, never "undefined"', () => {
    expect(resolveQuitConfirmDescription('control', { ...input, baseMessage: undefined })).toBe('');
    expect(
      resolveQuitConfirmDescription('stats-shown', { ...input, statsTemplate: undefined }),
    ).toBe('');
  });

  it('does not leave raw {placeholder} tokens in the stats string', () => {
    const out = resolveQuitConfirmDescription('stats-shown', input);
    expect(out).not.toMatch(/\{wordCount\}|\{score\}/);
  });
});
