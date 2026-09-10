/**
 * The quick-launch channel: the dashboard writes one intent, the express lobby
 * reads it once and turns it into a live room.
 *
 * Two pitfalls are load-bearing here (see .claude/rules/60-recurring-pitfalls.md):
 *  - class 1 (dual source of truth): the intent must EXPIRE, or a stale one
 *    written an hour ago hijacks a teacher who navigated to the lobby by hand.
 *  - class 4 (silent failure): a malformed blob must read as "no intent", never
 *    as a half-built one the express runner would launch with empty words.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  QUICK_LAUNCH_KEY,
  QUICK_LAUNCH_TTL_MS,
  writeQuickLaunchIntent,
  readQuickLaunchIntent,
  clearQuickLaunchIntent,
  parsePastedWords,
  pickQuickLaunchMode,
  type QuickLaunchIntent,
} from '../quickLaunchIntent';

const lessonIntent: QuickLaunchIntent = {
  source: 'lesson',
  title: 'Unit 4 — Weather',
  language: 'en',
  lessonId: '11111111-1111-4111-8111-111111111111',
  createdAt: 1_000,
};

describe('quickLaunchIntent store', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('round-trips an intent the dashboard wrote', () => {
    writeQuickLaunchIntent(lessonIntent);
    expect(readQuickLaunchIntent(1_500)).toEqual(lessonIntent);
  });

  it('stamps createdAt when the caller omits it', () => {
    writeQuickLaunchIntent({ source: 'pack', title: 'Pack', language: 'en', packKey: 'p' }, 4_242);
    expect(readQuickLaunchIntent(4_300)?.createdAt).toBe(4_242);
  });

  it('treats an intent older than the TTL as absent', () => {
    writeQuickLaunchIntent(lessonIntent);
    expect(readQuickLaunchIntent(1_000 + QUICK_LAUNCH_TTL_MS + 1)).toBeNull();
  });

  it('returns null — not a half-built intent — for a malformed blob', () => {
    sessionStorage.setItem(QUICK_LAUNCH_KEY, '{"source":"paste"');
    expect(readQuickLaunchIntent()).toBeNull();
    sessionStorage.setItem(QUICK_LAUNCH_KEY, JSON.stringify({ source: 'lesson' }));
    expect(readQuickLaunchIntent()).toBeNull();
    sessionStorage.setItem(QUICK_LAUNCH_KEY, JSON.stringify({ source: 'paste', title: 'x', language: 'en', words: [], createdAt: 1 }));
    expect(readQuickLaunchIntent(2)).toBeNull();
  });

  it('clears the intent so a reload falls through to the full setup screen', () => {
    writeQuickLaunchIntent(lessonIntent);
    clearQuickLaunchIntent();
    expect(readQuickLaunchIntent(1_500)).toBeNull();
  });
});

describe('parsePastedWords', () => {
  it('accepts the three things teachers actually paste: lines, commas, tabs', () => {
    expect(parsePastedWords('cat\ndog, fox\tbird')).toEqual(['cat', 'dog', 'fox', 'bird']);
  });

  it('drops blanks and case-insensitive duplicates, keeping the first spelling', () => {
    expect(parsePastedWords('Cat, , cat,\n\nCAT , dog')).toEqual(['Cat', 'dog']);
  });

  it('keeps non-latin words intact (Hebrew paste from a worksheet)', () => {
    expect(parsePastedWords('שלום, ספר')).toEqual(['שלום', 'ספר']);
  });

  it('caps the list so a pasted novel cannot blow the socket payload', () => {
    const many = Array.from({ length: 600 }, (_, i) => `w${i}`).join('\n');
    expect(parsePastedWords(many)).toHaveLength(200);
  });
});

describe('pickQuickLaunchMode', () => {
  it('picks vocab-quiz when enough words carry definitions', () => {
    const words = Array.from({ length: 4 }, (_, i) => ({ word: `w${i}`, definition: `d${i}` }));
    expect(pickQuickLaunchMode(words)).toBe('vocab-quiz');
  });

  it('falls back to classic for bare pasted words — a quiz has nothing to ask', () => {
    const words = Array.from({ length: 12 }, (_, i) => ({ word: `w${i}` }));
    expect(pickQuickLaunchMode(words)).toBe('classic');
  });

  it('falls back to classic when only a couple of words are defined', () => {
    expect(
      pickQuickLaunchMode([
        { word: 'a', definition: 'x' },
        { word: 'b', definition: ' ' },
        { word: 'c' },
        { word: 'd' },
      ])
    ).toBe('classic');
  });
});
