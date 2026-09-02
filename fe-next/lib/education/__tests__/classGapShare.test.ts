/**
 * Class-gap share URLs are the parent/Slack unfurl. They must stay on
 * lexiclash.live, never leak student names, and round-trip through query params.
 */
import { describe, it, expect } from 'vitest';
import {
  CLASS_GAP_ORIGIN,
  MAX_MISSED_WORDS,
  MAX_WORD_LENGTH,
  buildClassGapOgImageUrl,
  buildClassGapShareUrl,
  parseClassGapShareParams,
  toClassGapPayload,
} from '../classGapShare';

const input = {
  locale: 'en',
  lessonNames: ['Physics 101'],
  teacherName: 'Ms. Cohen',
  found: 2,
  total: 3,
  missedWords: ['neutron'],
};

describe('classGapShare', () => {
  it('builds a parent/Slack URL on the canonical lexiclash.live origin', () => {
    const url = new URL(buildClassGapShareUrl(input));
    expect(url.origin).toBe(CLASS_GAP_ORIGIN);
    expect(url.origin).toContain('lexiclash.live');
    expect(url.href).not.toContain('lexiclash.com');
    expect(url.pathname).toBe('/en/education/class-gap');
    expect(url.searchParams.get('lesson')).toBe('Physics 101');
    expect(url.searchParams.get('teacher')).toBe('Ms. Cohen');
    expect(url.searchParams.get('found')).toBe('2');
    expect(url.searchParams.get('total')).toBe('3');
    expect(url.searchParams.get('missed')).toBe('neutron');
  });

  it('points the OG image at /api/og/class-gap on the same live domain', () => {
    const url = new URL(buildClassGapOgImageUrl(input));
    expect(url.origin).toBe(CLASS_GAP_ORIGIN);
    expect(url.pathname).toBe('/api/og/class-gap');
    expect(url.href).not.toContain('lexiclash.com');
    expect(url.searchParams.get('missed')).toBe('neutron');
  });

  it('round-trips the public fields through query params', () => {
    const url = new URL(buildClassGapShareUrl(input));
    const parsed = parseClassGapShareParams(url.searchParams);
    expect(parsed).toEqual({
      locale: 'en',
      lesson: 'Physics 101',
      teacher: 'Ms. Cohen',
      found: 2,
      total: 3,
      missedWords: ['neutron'],
    });
  });

  it('never copies student names even if a caller stuffs them into extra fields', () => {
    const dirty = {
      ...input,
      // @ts-expect-error — proving extra fields are ignored
      masteryByPlayer: { Maya: { found: 2, total: 3 } },
      foundBy: ['Maya', 'Noa'],
    };
    const url = buildClassGapShareUrl(dirty);
    expect(url).not.toContain('Maya');
    expect(url).not.toContain('Noa');
  });

  it('caps the missed-word list so Slack unfurls stay inside URL length limits', () => {
    const missedWords = Array.from({ length: 40 }, (_, i) => `word${i}`);
    const payload = toClassGapPayload({ ...input, missedWords });
    expect(payload.missedWords).toHaveLength(MAX_MISSED_WORDS);
    const parsed = parseClassGapShareParams(new URL(buildClassGapShareUrl({ ...input, missedWords })).searchParams);
    expect(parsed.missedWords).toHaveLength(MAX_MISSED_WORDS);
  });

  it('truncates overlong words and strips control characters', () => {
    const word = `neutron\n${'x'.repeat(80)}`;
    const payload = toClassGapPayload({ ...input, missedWords: [word] });
    expect(payload.missedWords[0]).not.toContain('\n');
    expect(payload.missedWords[0].length).toBeLessThanOrEqual(MAX_WORD_LENGTH);
  });

  it('falls back to en for an unknown locale', () => {
    expect(toClassGapPayload({ ...input, locale: 'fr' }).locale).toBe('en');
  });

  it('allows an all-found card with an empty missed list', () => {
    const url = new URL(buildClassGapShareUrl({ ...input, missedWords: [], found: 3 }));
    expect(url.searchParams.has('missed')).toBe(false);
    expect(url.searchParams.get('found')).toBe('3');
  });
});
