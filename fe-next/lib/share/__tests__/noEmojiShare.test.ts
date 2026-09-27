/**
 * LexiClash shares never carry emoji — not in the paste text, not in the
 * localized callouts. Emoji text art reads as a Wordle knockoff and renders
 * inconsistently across platforms. The connections daily share shipped
 * ⚡ 🌉 😤 in every locale through `connections.daily.shareCallout`.
 */
import { describe, it, expect, vi } from 'vitest';
import { stripEmoji } from '../stripEmoji';
import { buildDailyBridgeGrid } from '@/lib/connections/shareGrid';
import { shareWithFallback } from '@/utils/shareWithFallback';

const EMOJI = /\p{Extended_Pictographic}/u;

describe('stripEmoji', () => {
  it('removes pictographs, variation selectors and ZWJ sequences, keeps text', () => {
    expect(stripEmoji('Perfect chain! ⚡ Not one slip.')).toBe('Perfect chain! Not one slip.');
    expect(stripEmoji('כל הגשרים נבנו. 🌉')).toBe('כל הגשרים נבנו.');
    expect(stripEmoji('⚔️ duel 👨‍👩‍👧 time')).toBe('duel time');
    expect(stripEmoji('line one 🔥\nline two')).toBe('line one\nline two');
  });

  it('keeps plain punctuation used in share text', () => {
    expect(stripEmoji('LexiClash · 3/5 · #2 — streak 4')).toBe('LexiClash · 3/5 · #2 — streak 4');
  });
});

describe('connections daily share', () => {
  it('drops emoji even when a localized callout carries one', () => {
    const text = buildDailyBridgeGrid({
      title: 'Word Bridge',
      dateISO: '2026-09-18',
      outcomes: [{ reached: true, solved: true, wrongAttempts: 0, hintUsed: false }],
      streak: 2,
      rank: 1,
      callout: 'Every bridge built. 🌉',
    });
    expect(text).not.toMatch(EMOJI);
    expect(text).toContain('Every bridge built.');
  });

  it.each(['en', 'he', 'es', 'sv', 'ja', 'ru'])('%s shareCallout strings are emoji-free', async (locale) => {
    const mod = await import(`@/translations/${locale}.js`);
    const found: string[] = [];
    const walk = (node: unknown, inCallout: boolean): void => {
      if (typeof node === 'string') { if (inCallout) found.push(node); return; }
      if (!node || typeof node !== 'object') return;
      for (const [k, v] of Object.entries(node)) walk(v, inCallout || k === 'shareCallout');
    };
    walk(mod.default ?? mod, false);
    expect(found.length).toBeGreaterThanOrEqual(5);
    for (const value of found) expect(value).not.toMatch(EMOJI);
  });
});

describe('shareWithFallback', () => {
  it('never hands emoji to native share or the clipboard', async () => {
    const share = vi.fn().mockRejectedValue(new Error('nope'));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, clipboard: { writeText } });
    await shareWithFallback({ title: 'Win 🏆', text: 'I won 🔥', url: 'https://x.test' });
    expect(share.mock.calls[0][0].title).toBe('Win');
    expect(share.mock.calls[0][0].text).toBe('I won');
    expect(writeText.mock.calls[0][0]).not.toMatch(EMOJI);
    vi.unstubAllGlobals();
  });
});
