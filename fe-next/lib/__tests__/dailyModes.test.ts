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
  it('lists the three visible daily modes (Word Tower hidden 2026-09-13)', () => {
    const ids = DAILY_MODES.map((m) => m.id);
    expect(ids).toContain('word-hunt');
    expect(ids).toContain('word-wheel');
    expect(ids).toContain('connections');
    // Word Tower is hidden from consumer surfaces (Ohad directive 2026-09-13):
    // out of the registry → no daily quest card, out of the hub /N denominator.
    expect(ids).not.toContain('word-tower');
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

  // Word Hunt and Word Wheel are drawn with the shared QuestCard chrome (bespoke
  // hero cards), so they are excluded from the generic registry-card list.
  // Connections STAYS generic — the DailyModeQuestCard already gives it
  // full-bleed mascot art and a played badge, and its hard-nav `<a>` guarantees
  // the daily host re-reads the date. (Word Tower sat between these two worlds
  // until 2026-09-13, when it left the registry entirely.)
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

  // Word Tower used to assert its SPA daily href here (/he/daily/word-tower) —
  // it left the registry 2026-09-13, so the locale-prefix check now runs on
  // Word Wheel (same plain-path shape the tower assertion guarded).
  it('prefixes the locale on the daily route href', () => {
    const wheel = DAILY_MODES.find((m) => m.id === 'word-wheel')!;
    expect(dailyModeHref(wheel, 'he')).toBe('/he/daily/word-wheel');
  });

  it('every mode carries i18n title + desc keys', () => {
    DAILY_MODES.forEach((m: DailyModeDef) => {
      expect(m.titleKey.length).toBeGreaterThan(0);
      expect(m.descKey.length).toBeGreaterThan(0);
    });
  });
});
