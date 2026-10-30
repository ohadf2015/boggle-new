import { describe, it, expect } from 'vitest';
import {
  DAILY_MODES,
  requiredDailyModes,
  dailyModeHref,
  type DailyModeDef,
} from '@/lib/dailyModes';

describe('dailyModes registry', () => {
  it('lists the four known daily modes', () => {
    const ids = DAILY_MODES.map((m) => m.id);
    expect(ids).toContain('word-hunt');
    expect(ids).toContain('word-wheel');
    expect(ids).toContain('word-tower');
    expect(ids).toContain('connections');
  });

  it('requires Word Wheel and Word Hunt to clear the day; the rest are bonus', () => {
    expect(requiredDailyModes(DAILY_MODES).map((m) => m.id)).toEqual(['word-wheel', 'word-hunt']);
  });

  it('marks the timed modes (the hub labels them Timed / No timer)', () => {
    expect(DAILY_MODES.filter((m) => m.timed).map((m) => m.id)).toEqual(['word-wheel', 'word-hunt']);
  });

  it('registers Connections as a PUBLIC daily card pointing at the variant-aware daily route', () => {
    const connections = DAILY_MODES.find((m) => m.id === 'connections')!;
    expect(connections).toBeDefined();
    expect(connections.path).toBe('/connections/daily');
    expect(connections.accent).toBe('purple');
    expect(dailyModeHref(connections, 'he')).toBe('/he/connections/daily');
  });

  // Same commit moved Word Tower off the hard-nav query form (/word-tower?daily=1)
  // onto the SPA daily route, so the href is a plain locale-prefixed path now.
  it('prefixes the locale on the daily route href', () => {
    const tower = DAILY_MODES.find((m) => m.id === 'word-tower')!;
    expect(dailyModeHref(tower, 'he')).toBe('/he/word-tower/daily');
  });

  it('every mode carries i18n title + desc keys', () => {
    DAILY_MODES.forEach((m: DailyModeDef) => {
      expect(m.titleKey.length).toBeGreaterThan(0);
      expect(m.descKey.length).toBeGreaterThan(0);
    });
  });
});
