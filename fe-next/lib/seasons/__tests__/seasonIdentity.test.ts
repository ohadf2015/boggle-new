import { describe, it, expect } from 'vitest';
import { getSeasonIdentity, seasonEndsIn } from '@/lib/seasons';

describe('getSeasonIdentity', () => {
  it('returns the catalog identity for a season id (theme, accent, skin, twist)', () => {
    const s6 = getSeasonIdentity(6);
    expect(s6.theme).toBe('Lexicon Lords');
    expect(s6.accentColor).toBe('#FF6B35');
    expect(s6.gridSkinClass).toBe('season-skin-lexicon');
    expect(s6.twist.emoji).toBe('🏰');
  });

  it('wraps around the catalog so every future season has an identity', () => {
    expect(getSeasonIdentity(13).theme).toBe(getSeasonIdentity(1).theme);
  });
});

describe('seasonEndsIn', () => {
  it('splits the remaining time into whole days and hours', () => {
    const now = new Date('2026-09-07T10:00:00Z');
    const end = new Date('2026-10-01T00:00:00Z');
    expect(seasonEndsIn(end, now)).toEqual({ days: 23, hours: 14, ended: false });
  });

  it('reports an ended season as zero remaining', () => {
    const now = new Date('2026-10-02T00:00:00Z');
    const end = new Date('2026-10-01T00:00:00Z');
    expect(seasonEndsIn(end, now)).toEqual({ days: 0, hours: 0, ended: true });
  });
});
