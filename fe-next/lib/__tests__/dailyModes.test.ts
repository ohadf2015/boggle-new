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
  it('lists the four known daily modes', () => {
    const ids = DAILY_MODES.map((m) => m.id);
    expect(ids).toContain('word-hunt');
    expect(ids).toContain('word-wheel');
    expect(ids).toContain('word-tower');
    expect(ids).toContain('connections');
  });

  it('ships every daily mode PUBLIC (no admin gate left in the registry)', () => {
    for (const mode of DAILY_MODES) {
      expect(mode.adminOnly, `${mode.id} should be public`).toBe(false);
    }
  });

  it('shows all modes to non-admins and admins alike', () => {
    const publicIds = visibleDailyModes(false).map((m) => m.id);
    expect(publicIds).toEqual(DAILY_MODES.map((m) => m.id));
    expect(visibleDailyModes(true).map((m) => m.id)).toEqual(publicIds);
  });

  it('adminOnlyDailyModes is empty now that Connections graduated', () => {
    expect(adminOnlyDailyModes()).toEqual([]);
  });

  // Word Tower graduated OUT of the generic quest cards in 42bc4968a (2026-08-18,
  // "render Word Tower with the shared daily QuestCard"): once it went public it is
  // drawn with the same QuestCard chrome as Word Hunt and Word Wheel, so all three
  // are excluded here. Connections is the second public mode but STAYS generic —
  // the DailyModeQuestCard already gives it full-bleed mascot art and a played
  // badge, and its hard-nav `<a>` guarantees the daily host re-reads the date.
  it('exposes the registry-driven quest cards (everything but the bespoke hero cards)', () => {
    const publicIds = questCardModes(false).map((m) => m.id);
    expect(publicIds).toEqual(['connections']);
    const adminIds = questCardModes(true).map((m) => m.id);
    expect(adminIds).toEqual(['connections']);
  });

  it('registers Connections as a PUBLIC daily card pointing at the variant-aware daily route', () => {
    const connections = DAILY_MODES.find((m) => m.id === 'connections')!;
    expect(connections).toBeDefined();
    expect(connections.adminOnly).toBe(false);
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
