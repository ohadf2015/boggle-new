import { describe, it, expect } from 'vitest';
import {
  getMonthlySeasonBounds,
  getCurrentSeasonDynamic,
  GRANDFATHERED_SEASON_1_END,
} from '../seasons';

describe('getMonthlySeasonBounds', () => {
  it('grandfathers Jan 2026 into Season 1', () => {
    const bounds = getMonthlySeasonBounds(new Date('2026-01-15T12:00:00Z'));
    expect(bounds.id).toBe(1);
    expect(bounds.start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(bounds.end.toISOString()).toBe(GRANDFATHERED_SEASON_1_END);
  });

  it('grandfathers Feb-Apr 2026 into Season 1', () => {
    expect(getMonthlySeasonBounds(new Date('2026-02-10T00:00:00Z')).id).toBe(1);
    expect(getMonthlySeasonBounds(new Date('2026-03-31T23:59:59Z')).id).toBe(1);
    expect(getMonthlySeasonBounds(new Date('2026-04-26T00:00:00Z')).id).toBe(1);
  });

  it('returns Season 2 for May 2026 (first monthly season)', () => {
    const bounds = getMonthlySeasonBounds(new Date('2026-05-15T00:00:00Z'));
    expect(bounds.id).toBe(2);
    expect(bounds.start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('increments season id monthly thereafter', () => {
    expect(getMonthlySeasonBounds(new Date('2026-06-15T00:00:00Z')).id).toBe(3);
    expect(getMonthlySeasonBounds(new Date('2026-12-15T00:00:00Z')).id).toBe(9);
  });

  it('rolls over the year boundary correctly', () => {
    const dec = getMonthlySeasonBounds(new Date('2026-12-15T00:00:00Z'));
    expect(dec.start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(dec.end.toISOString()).toBe('2027-01-01T00:00:00.000Z');

    const jan2027 = getMonthlySeasonBounds(new Date('2027-01-15T00:00:00Z'));
    expect(jan2027.id).toBe(10);
    expect(jan2027.start.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    expect(jan2027.end.toISOString()).toBe('2027-02-01T00:00:00.000Z');
  });

  it('handles the exact boundary instant (2026-05-01T00:00:00Z) as Season 2', () => {
    const boundary = getMonthlySeasonBounds(new Date('2026-05-01T00:00:00Z'));
    expect(boundary.id).toBe(2);
    expect(boundary.start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });
});

describe('getCurrentSeasonDynamic', () => {
  it('returns Season 1 for any date inside grandfathered window', () => {
    const season = getCurrentSeasonDynamic(new Date('2026-04-26T00:00:00Z'));
    expect(season.id).toBe(1);
    expect(season.name).toContain('Season 1');
    expect(season.startDate.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(season.endDate.toISOString()).toBe(GRANDFATHERED_SEASON_1_END);
    expect(season.rewards.length).toBeGreaterThan(0);
  });

  it('returns Season 2 for May 2026', () => {
    const season = getCurrentSeasonDynamic(new Date('2026-05-15T00:00:00Z'));
    expect(season.id).toBe(2);
    expect(season.name).toContain('Season 2');
  });

  it('cycles theme names through SEASON_THEMES list', () => {
    const s2 = getCurrentSeasonDynamic(new Date('2026-05-15T00:00:00Z'));
    const s6 = getCurrentSeasonDynamic(new Date('2026-09-15T00:00:00Z'));
    expect(s2.theme).toBeTruthy();
    expect(s6.theme).toBeTruthy();
  });

  it('falls back to current date when called with no argument', () => {
    const season = getCurrentSeasonDynamic();
    expect(season.id).toBeGreaterThan(0);
    expect(season.startDate).toBeInstanceOf(Date);
    expect(season.endDate.getTime()).toBeGreaterThan(season.startDate.getTime());
  });

  it('attaches themed art (image + accent + tagline) for seasons 1-6', () => {
    const cases: Array<{ date: string; theme: string; image: string; accent: string }> = [
      { date: '2026-04-15T00:00:00Z', theme: 'Word Warriors',      image: '/seasons/season-1-word-warriors.jpg',     accent: '#BFFF00' },
      { date: '2026-05-15T00:00:00Z', theme: 'Letter Legends',     image: '/seasons/season-2-letter-legends.jpg',    accent: '#FF1493' },
      { date: '2026-06-15T00:00:00Z', theme: 'Vocab Victors',      image: '/seasons/season-3-vocab-victors.jpg',     accent: '#00FFFF' },
      { date: '2026-07-15T00:00:00Z', theme: 'Syllable Champions', image: '/seasons/season-4-syllable-champions.jpg', accent: '#8B5CF6' },
      { date: '2026-08-15T00:00:00Z', theme: 'Phonic Phenoms',     image: '/seasons/season-5-phonic-phenoms.jpg',    accent: '#FFE135' },
      { date: '2026-09-15T00:00:00Z', theme: 'Lexicon Lords',      image: '/seasons/season-6-lexicon-lords.jpg',     accent: '#FF6B35' },
    ];
    for (const { date, theme, image, accent } of cases) {
      const season = getCurrentSeasonDynamic(new Date(date));
      expect(season.theme).toBe(theme);
      expect(season.imageUrl).toBe(image);
      expect(season.accentColor).toBe(accent);
      expect(season.tagline.length).toBeGreaterThan(0);
    }
  });

  it('cycles future seasons through the identity catalog (no season-1 fallback)', () => {
    const future = getCurrentSeasonDynamic(new Date('2027-06-15T00:00:00Z'));
    expect(future.id).toBeGreaterThan(12);
    // Future seasons get a real cycled identity, not the old season-1 fallback.
    expect(future.imageUrl).toMatch(/^\/seasons\/season-\d+-/);
    expect(future.accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(future.twist.key).toBeTruthy();
    expect(future.gridSkinClass).toMatch(/^season-skin-/);
  });
});
