import { describe, it, expect } from 'vitest';
import {
  DAILY_MODES,
  visibleDailyModes,
  adminOnlyDailyModes,
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

  it('keeps Word Tower admin-only (not yet public) while the live modes are public', () => {
    const tower = DAILY_MODES.find((m) => m.id === 'word-tower')!;
    expect(tower.adminOnly).toBe(true);
    expect(DAILY_MODES.find((m) => m.id === 'word-hunt')!.adminOnly).toBe(false);
    expect(DAILY_MODES.find((m) => m.id === 'word-wheel')!.adminOnly).toBe(false);
  });

  it('hides admin-only modes from non-admins', () => {
    const ids = visibleDailyModes(false).map((m) => m.id);
    expect(ids).not.toContain('word-tower');
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
    expect(ids).toEqual(['word-tower', 'connections']);
  });

  it('registers Connections as an admin-gated daily card pointing at the daily route', () => {
    const connections = DAILY_MODES.find((m) => m.id === 'connections')!;
    expect(connections).toBeDefined();
    expect(connections.adminOnly).toBe(true);
    expect(connections.path).toBe('/connections/daily');
    expect(connections.accent).toBe('purple');
    expect(dailyModeHref(connections, 'he')).toBe('/he/connections/daily');
  });

  it('prefixes the locale and preserves the daily query for the href', () => {
    const tower = DAILY_MODES.find((m) => m.id === 'word-tower')!;
    expect(dailyModeHref(tower, 'he')).toBe('/he/word-tower?daily=1');
  });

  it('every mode carries i18n title + desc keys', () => {
    DAILY_MODES.forEach((m: DailyModeDef) => {
      expect(m.titleKey.length).toBeGreaterThan(0);
      expect(m.descKey.length).toBeGreaterThan(0);
    });
  });
});
