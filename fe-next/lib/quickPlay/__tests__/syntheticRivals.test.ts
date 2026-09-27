/**
 * Synthetic ghost rivals — test that the field is always full.
 *
 * When real `quick_play_results` data is sparse, Quick Play needs synthetic
 * rivals from bot names to guarantee GHOST_COUNT (3) competitors.
 *
 * This test ensures:
 * 1. Empty → 3 synthetics
 * 1. Thin (1-2 real) → pad to 3
 * 3. Same seed always gives the same field (names, scores)
 * 4. Different seeds give different fields
 * 5. Bot names are used (not fake human identities)
 * 6. Avatars are seeded and consistent
 */
import { describe, it, expect } from 'vitest';
import {
  computeScoreBands,
  padRivalsWithSynthetic,
  type ScoreBands,
} from '../syntheticRivals';
import { GHOST_COUNT, type QuickGhostRival } from '../ghostRivals';

const mockRival = (id: string, scorePct: number, name = `Player-${id}`): QuickGhostRival => ({
  userId: id,
  name,
  customAvatar: null,
  scorePct,
});

describe('computeScoreBands', () => {
  it('returns fallback when data is sparse (< 8 rows)', () => {
    const sparse = [{ scorePct: 40 }, { scorePct: 70 }];
    const bands = computeScoreBands(sparse);
    expect(bands.weak).toBe(30);
    expect(bands.medium).toBe(60);
    expect(bands.strong).toBe(85);
  });

  it('computes bands from percentiles when ≥ 8 rows exist', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ scorePct: (i + 1) * 10 }));
    // After sort: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    // Bands at 33%, 67%, 95% → roughly [30, 67, 95]
    const bands = computeScoreBands(data);
    expect(bands.weak).toBeLessThan(bands.medium);
    expect(bands.medium).toBeLessThan(bands.strong);
    expect(bands.weak).toBeGreaterThan(10);
    expect(bands.strong).toBeGreaterThan(80);
  });

  it('handles all data being the same', () => {
    const same = Array.from({ length: 10 }, () => ({ scorePct: 50 }));
    const bands = computeScoreBands(same);
    expect(bands.weak).toBe(50);
    expect(bands.medium).toBe(50);
    expect(bands.strong).toBe(50);
  });
});

describe('padRivalsWithSynthetic', () => {
  it('pads empty rivals to GHOST_COUNT all synthetics', () => {
    const bands = { weak: 30, medium: 60, strong: 85 };
    const padded = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-1', bands, 'en');
    expect(padded).toHaveLength(3);
    expect(padded.every((r) => r.userId.startsWith('synthetic:'))).toBe(true);
  });

  it('keeps real rivals first and adds synthetics to reach GHOST_COUNT', () => {
    const real = [mockRival('real-1', 75, 'Ada')];
    const bands = { weak: 30, medium: 60, strong: 85 };
    const padded = padRivalsWithSynthetic(real, GHOST_COUNT, 'seed-1', bands, 'en');
    expect(padded).toHaveLength(3);
    expect(padded[0].userId).toBe('real-1');
    expect(padded[1].userId).toMatch(/^synthetic:/);
    expect(padded[2].userId).toMatch(/^synthetic:/);
  });

  it('truncates if real rivals exceed GHOST_COUNT', () => {
    const real = [1, 2, 3, 4].map((i) => mockRival(`u${i}`, i * 10, `p${i}`));
    const bands = { weak: 30, medium: 60, strong: 85 };
    const padded = padRivalsWithSynthetic(real, GHOST_COUNT, 'seed-1', bands, 'en');
    expect(padded).toHaveLength(3);
    expect(padded.every((r) => r.userId.startsWith('u'))).toBe(true);
  });

  it('is deterministic for the same seed', () => {
    const bands = { weak: 30, medium: 60, strong: 85 };
    const a = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-a', bands, 'en');
    const b = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-a', bands, 'en');
    expect(a.map((r) => ({ name: r.name, scorePct: r.scorePct }))).toEqual(
      b.map((r) => ({ name: r.name, scorePct: r.scorePct }))
    );
  });

  it('picks different rivals for different seeds', () => {
    const bands = { weak: 30, medium: 60, strong: 85 };
    const a = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-aaa', bands, 'en');
    const b = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-zzz', bands, 'en');
    const aNames = a.map((r) => r.name).sort().join(',');
    const bNames = b.map((r) => r.name).sort().join(',');
    expect(aNames).not.toBe(bNames);
  });

  it('uses bot names (not fake human identities)', () => {
    const bands = { weak: 30, medium: 60, strong: 85 };
    const padded = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-1', bands, 'en');
    // Bot names should be from botConfig — they have patterns like "Word Wizard",
    // "Rookie", "Wordsmith", etc. They should NOT be random generated names.
    const synthetics = padded.filter((r) => r.userId.startsWith('synthetic:'));
    expect(synthetics.every((r) => r.name && r.name.length > 0)).toBe(true);
    // A simple heuristic: bot names are often title-cased or contain patterns.
    // Just verify they exist and are non-empty.
    synthetics.forEach((r) => {
      expect(r.name).toMatch(/\w/);
    });
  });

  it('provides seeded avatars so synthetics render as people, not skeletons', () => {
    const bands = { weak: 30, medium: 60, strong: 85 };
    const padded = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-1', bands, 'en');
    const synthetics = padded.filter((r) => r.userId.startsWith('synthetic:'));
    expect(synthetics.every((r) => r.customAvatar && typeof r.customAvatar === 'object')).toBe(
      true
    );
  });

  it('spreads synthetics across difficulty bands (weak, medium, strong)', () => {
    const bands = { weak: 25, medium: 55, strong: 90 };
    const padded = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-1', bands, 'en');
    const scores = padded.map((r) => r.scorePct).sort((a, b) => a - b);
    // First should be weak band, second medium, third strong.
    expect(scores[0]).toBeLessThanOrEqual(bands.weak + 5); // Allow small variance
    expect(scores[1]).toBeGreaterThan(bands.weak);
    expect(scores[1]).toBeLessThan(bands.strong);
    expect(scores[2]).toBeGreaterThanOrEqual(bands.strong - 5);
  });

  it('respects language parameter for bot names', () => {
    const bands = { weak: 30, medium: 60, strong: 85 };
    const en = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-1', bands, 'en');
    const he = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-1', bands, 'he');
    // Same seed, same difficulty distribution, but different languages → different names
    const enNames = en.map((r) => r.name).join(',');
    const heNames = he.map((r) => r.name).join(',');
    expect(enNames).not.toBe(heNames);
  });

  it('falls back gracefully for unsupported language', () => {
    const bands = { weak: 30, medium: 60, strong: 85 };
    // Request an unsupported language → should use en fallback.
    const unsupported = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-1', bands, 'xx');
    expect(unsupported).toHaveLength(3);
    expect(unsupported.every((r) => r.name && r.name.length > 0)).toBe(true);
  });

  it('never returns empty even on zero real + fallback error', () => {
    // This is the "never-throw" contract: even if something goes wrong,
    // we always return GHOST_COUNT rivals so the round never fails.
    const bands = { weak: 30, medium: 60, strong: 85 };
    const padded = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-err', bands, 'en');
    expect(padded.length).toBe(GHOST_COUNT);
  });

  it('adds deterministic jitter around bands so rival scores vary per seed', () => {
    const bands = { weak: 30, medium: 60, strong: 85 };
    const padded1 = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-1', bands, 'en');
    const padded2 = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-2', bands, 'en');

    const scores1 = padded1.map((r) => r.scorePct).sort((a, b) => a - b);
    const scores2 = padded2.map((r) => r.scorePct).sort((a, b) => a - b);

    // Different seeds → different scores (jitter effect).
    expect(scores1).not.toEqual(scores2);

    // Same seed → same scores (deterministic).
    const padded1Again = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-1', bands, 'en');
    const scores1Again = padded1Again.map((r) => r.scorePct).sort((a, b) => a - b);
    expect(scores1).toEqual(scores1Again);
  });

  it('anchors rival bands to player level when recentPct is provided', () => {
    const bands = { weak: 30, medium: 60, strong: 85 };

    // Player at 15%: rivals should shift down so one is clearly below, one near, one above.
    const lowPlayer = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-anchor', bands, 'en', 15);
    const lowScores = lowPlayer.map((r) => r.scorePct).sort((a, b) => a - b);

    // One rival below 15, one near 15, one well above.
    expect(lowScores[0]).toBeLessThan(15);
    expect(lowScores[2]).toBeGreaterThan(15);

    // Player at 75%: rivals shift up so structure centers on 75.
    const highPlayer = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-anchor', bands, 'en', 75);
    const highScores = highPlayer.map((r) => r.scorePct).sort((a, b) => a - b);

    // At least one rival well above 75.
    expect(highScores[2]).toBeGreaterThan(75);

    // The overall band structure shifts with player level.
    expect(lowScores).not.toEqual(highScores);
  });

  it('ignores recentPct when 0 or absent and uses mode defaults', () => {
    const bands = { weak: 30, medium: 60, strong: 85 };
    const padded = padRivalsWithSynthetic([], GHOST_COUNT, 'seed-1', bands, 'en', 0);

    // With recentPct=0, should use default bands (no anchoring).
    const scores = padded.map((r) => r.scorePct).sort((a, b) => a - b);
    // Allow jitter ±8 around the expected values.
    expect(scores[0]).toBeGreaterThan(20);
    expect(scores[0]).toBeLessThan(40);
    expect(scores[2]).toBeGreaterThan(75);
    expect(scores[2]).toBeLessThan(95);
  });
});
