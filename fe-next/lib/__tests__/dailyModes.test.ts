import { describe, it, expect } from 'vitest';
import {
  DAILY_MODES,
  visibleDailyModes,
  adminOnlyDailyModes,
  questCardModes,
  dailyModeHref,
  type DailyModeDef,
} from '@/lib/dailyModes';

describe('dailyModes registry', () => {
  it('lists the three known daily modes', () => {
    const ids = DAILY_MODES.map((m) => m.id);
    expect(ids).toContain('word-hunt');
    expect(ids).toContain('word-wheel');
    expect(ids).toContain('word-tower');
  });

  it('ships Word Tower as a PUBLIC daily mode alongside the other live modes', () => {
    const tower = DAILY_MODES.find((m) => m.id === 'word-tower')!;
    expect(tower.adminOnly).toBe(false);
    expect(DAILY_MODES.find((m) => m.id === 'word-hunt')!.adminOnly).toBe(false);
    expect(DAILY_MODES.find((m) => m.id === 'word-wheel')!.adminOnly).toBe(false);
  });

  it('hides admin-only modes from non-admins but keeps the public ones', () => {
    const ids = visibleDailyModes(false).map((m) => m.id);
    expect(ids).not.toContain('connections');
    expect(ids).toContain('word-tower');
    expect(ids).toContain('word-hunt');
  });

  it('shows every mode to admins', () => {
    const ids = visibleDailyModes(true).map((m) => m.id);
    expect(ids).toContain('word-tower');
    expect(ids).toContain('word-hunt');
    expect(ids).toContain('word-wheel');
  });

  it('adminOnlyDailyModes returns the future-gated modes only', () => {
    const ids = adminOnlyDailyModes().map((m) => m.id);
    expect(ids).toEqual(['connections']);
  });

  // Word Tower graduated OUT of the generic quest cards in 42bc4968a (2026-08-18,
  // "render Word Tower with the shared daily QuestCard"): once it went public it is
  // drawn with the same QuestCard chrome as Word Hunt and Word Wheel, so all three
  // are excluded here. This test asserted the pre-graduation shape and had been red
  // on master ever since.
  it('exposes the registry-driven quest cards (everything but the bespoke hero cards)', () => {
    const publicIds = questCardModes(false).map((m) => m.id);
    expect(publicIds).toEqual([]);
    const adminIds = questCardModes(true).map((m) => m.id);
    expect(adminIds).toEqual(['connections']);
  });

  it('registers Connections as an admin-gated daily card pointing at the daily route', () => {
    const connections = DAILY_MODES.find((m) => m.id === 'connections')!;
    expect(connections).toBeDefined();
    expect(connections.adminOnly).toBe(true);
    expect(connections.path).toBe('/connections/daily');
    expect(connections.accent).toBe('purple');
    expect(dailyModeHref(connections, 'he')).toBe('/he/connections/daily');
  });

  // Same commit moved Word Tower off the hard-nav query form (/word-tower?daily=1)
  // onto the SPA daily route, so the href is a plain locale-prefixed path now.
  it('prefixes the locale on the daily route href', () => {
    const tower = DAILY_MODES.find((m) => m.id === 'word-tower')!;
    expect(dailyModeHref(tower, 'he')).toBe('/he/daily/word-tower');
  });

  it('every mode carries i18n title + desc keys', () => {
    DAILY_MODES.forEach((m: DailyModeDef) => {
      expect(m.titleKey.length).toBeGreaterThan(0);
      expect(m.descKey.length).toBeGreaterThan(0);
    });
  });
});
