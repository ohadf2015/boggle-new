/**
 * Streak sharing — turns a streak into the tier-matched OG card and hands it to
 * the platform share sheet.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildStreakShareText, streakOgUrl, shareStreak } from '../streakShare';

const t = (key: string, _fallback?: string, params?: Record<string, string | number>) => {
  const dict: Record<string, string> = {
    'daily.streakShare.text': '{days}-day streak on LexiClash',
  };
  let out = dict[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) out = out.replace(`{${k}}`, String(v));
  }
  return out;
};

describe('buildStreakShareText', () => {
  it('includes the day count and the site so a paste is actionable', () => {
    const text = buildStreakShareText(23, t);
    expect(text).toContain('23');
    expect(text).toContain('lexiclash.live');
  });
});

describe('streakOgUrl', () => {
  it('carries streak and tier so the card matches what the player saw', () => {
    const url = streakOgUrl({ streak: 30, tierId: 'legendary', origin: 'https://lexiclash.live' });
    expect(url).toContain('/api/og/streak');
    expect(url).toContain('streak=30');
    expect(url).toContain('tier=legendary');
  });
});

describe('shareStreak', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['png'], { type: 'image/png' }),
    }) as unknown as typeof fetch;
    // jsdom has no FileReader-backed dataUrl path worth exercising here; the
    // helper only needs a string, so stub the object-URL bridge.
    global.URL.createObjectURL = vi.fn(() => 'blob:streak');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('shares the fetched card as a file when the platform accepts files', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share, canShare: vi.fn(() => true) });

    const ok = await shareStreak({ streak: 12, tierId: 'fire', t });

    expect(ok).toBe(true);
    expect(share).toHaveBeenCalled();
    const arg = share.mock.calls[0][0];
    expect(arg.files).toHaveLength(1);
  });

  it('falls back to a text share when files are refused', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share, canShare: vi.fn(() => false) });

    const ok = await shareStreak({ streak: 12, tierId: 'fire', t });

    expect(ok).toBe(true);
    expect(share.mock.calls[0][0].files).toBeUndefined();
    expect(share.mock.calls[0][0].text).toContain('12');
  });

  // A failed image fetch must not swallow the share — the brag is the point,
  // the picture is the garnish.
  it('still text-shares when the card image cannot be fetched', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share, canShare: vi.fn(() => true) });

    const ok = await shareStreak({ streak: 5, tierId: 'hot', t });

    expect(ok).toBe(true);
    expect(share.mock.calls[0][0].files).toBeUndefined();
  });

  it('reports failure rather than throwing when the platform cannot share at all', async () => {
    Object.assign(navigator, { share: undefined, canShare: undefined });
    await expect(shareStreak({ streak: 5, tierId: 'hot', t })).resolves.toBe(false);
  });
});
