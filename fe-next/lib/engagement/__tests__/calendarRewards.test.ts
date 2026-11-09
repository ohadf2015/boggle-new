import { describe, it, expect } from 'vitest';
import { CALENDAR_REWARDS, MYSTERY_BOX_MULTIPLIER, MYSTERY_BOX_POOL, rollCalendarMysteryBox } from '../calendarRewards';

describe('calendar mystery box', () => {
  it('Given the same player, day and rarity, Then the server always rolls the same contents', () => {
    const a = rollCalendarMysteryBox('p1', '2026-11-07', 'rare');
    expect(rollCalendarMysteryBox('p1', '2026-11-07', 'rare')).toEqual(a);
  });

  it('only rolls contents something can be credited to (XP, streak freezes), scaled by rarity', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      for (const rarity of ['common', 'rare', 'epic', 'legendary'] as const) {
        const box = rollCalendarMysteryBox(`p${i}`, '2026-11-07', rarity);
        const entry = MYSTERY_BOX_POOL.find((e) => e.type === box.type);
        expect(entry).toBeDefined();
        expect(box.amount).toBe(entry!.base * MYSTERY_BOX_MULTIPLIER[rarity]);
        seen.add(box.type);
      }
    }
    expect([...seen].sort()).toEqual(['streak_freeze', 'xp']);
  });

  it('never holds hints: nothing in the game spends free_hints_available', () => {
    expect(MYSTERY_BOX_POOL.map((e) => e.type)).not.toContain('hints');
  });

  it('keeps the boxes on days 7, 14, 21 and 30', () => {
    expect(CALENDAR_REWARDS.filter((r) => r.type === 'mystery_box').map((r) => [r.day, r.rarity])).toEqual([
      [7, 'common'], [14, 'rare'], [21, 'epic'], [30, 'legendary'],
    ]);
  });
});
