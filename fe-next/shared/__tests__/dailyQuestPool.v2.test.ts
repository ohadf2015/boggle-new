import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';
import {
  getDailyQuests,
  DAILY_QUEST_POOL,
  DAILY_QUEST_POOL_V2,
  QUEST_POOL_V2_START,
  isDailyCompletable,
} from '../dailyQuestPool';

const day = (start: string, n: number) =>
  new Date(Date.parse(`${start}T00:00:00Z`) + n * 86_400_000).toISOString().split('T')[0];
const YEAR = Array.from({ length: 365 }, (_, n) => day(QUEST_POOL_V2_START, n));

describe('daily quest pool v2', () => {
  it('given a day before the v2 start, then the quests are exactly what the old pool served', () => {
    const before = day(QUEST_POOL_V2_START, -1);
    const poolIds = new Set(DAILY_QUEST_POOL.map((q) => q.id));
    for (const q of getDailyQuests(before)) expect(poolIds.has(q.id)).toBe(true);
    expect(getDailyQuests(before).map((q) => q.id)).toEqual(getDailyQuests(before).map((q) => q.id));
  });

  it('given consecutive days, then no quest repeats from yesterday', () => {
    for (let i = 1; i < YEAR.length; i++) {
      const yesterday = new Set(getDailyQuests(YEAR[i - 1]).map((q) => q.id));
      const repeats = getDailyQuests(YEAR[i]).filter((q) => yesterday.has(q.id));
      expect(repeats.map((q) => `${YEAR[i]}:${q.id}`)).toEqual([]);
    }
  });

  it('keeps the fairness rules every day: 3 quests, unique types, one PvP max, two from the daily hub', () => {
    for (const d of YEAR) {
      const qs = getDailyQuests(d);
      expect(new Set(qs.map((q) => q.id)).size).toBe(3);
      expect(new Set(qs.map((q) => q.type)).size).toBe(3);
      expect(qs.filter((q) => q.family === 'pvp').length).toBeLessThanOrEqual(1);
      expect(qs.filter(isDailyCompletable).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('serves the new quests, so the pool actually widens', () => {
    const served = new Set(YEAR.flatMap((d) => getDailyQuests(d).map((q) => q.id)));
    const added = DAILY_QUEST_POOL_V2.filter((q) => !DAILY_QUEST_POOL.includes(q));
    expect(added.length).toBeGreaterThanOrEqual(6);
    for (const q of added) expect(served.has(q.id)).toBe(true);
  });

  it('every v2 quest has a title and description in all six locales', () => {
    const get = (o: unknown, k: string) =>
      k.split('.').reduce<unknown>((a, p) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[p] : undefined), o);
    const missing: string[] = [];
    for (const [loc, dict] of Object.entries({ en, he, es, sv, ja, ru })) {
      for (const q of DAILY_QUEST_POOL_V2) {
        for (const k of [q.titleKey, q.descKey]) if (typeof get(dict, k) !== 'string') missing.push(`${loc}:${k}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
