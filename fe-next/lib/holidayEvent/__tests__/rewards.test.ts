import { describe, it, expect } from 'vitest';
import { holidayReward, holidayRewards, HOLIDAY_PART_KEYS, HOLIDAY_ALL_PART_KEYS, eventKeyFor } from '../rewards';
import { windowFor } from '@/lib/holidays/calendar';

describe('holiday rewards', () => {
  it('Given Hanukkah, when listing nights, then even nights give the four blue parts and night 8 the title', () => {
    const r = holidayRewards('hanukkah');
    expect(r).toHaveLength(8);
    expect(r.map((x) => x.partKey ?? null)).toEqual([
      null, 'accessory:beanieBlue', null, 'accessory:scarfBlue', null, 'accessory:dreidelPin', null, 'accessory:menorahCrown',
    ]);
    expect(r[7].title).toBe('keeperOfTheLight');
    for (const i of [0, 2, 4, 6]) expect(r[i].coins).toBeGreaterThan(0);
  });

  it('Given Christmas, when listing gifts, then days 2..12 even give the six parts and day 12 the title', () => {
    const r = holidayRewards('christmas');
    expect(r).toHaveLength(12);
    expect([1, 3, 5, 7, 9, 11].map((i) => r[i].partKey)).toEqual([
      'accessory:santaHat', 'accessory:elfHat', 'accessory:antlers', 'accessory:earmuffs', 'accessory:scarfXmas', 'accessory:candyGlasses',
    ]);
    expect(r[11].title).toBe('snowChampion');
    for (const i of [0, 2, 4, 6, 8, 10]) expect(r[i].coins).toBeGreaterThan(0);
  });

  it('Given an index off the track, then there is no reward', () => {
    expect(holidayReward('hanukkah', 8)).toBeNull();
    expect(holidayReward('christmas', -1)).toBeNull();
  });

  it('lists all ten holiday part keys once', () => {
    expect(new Set(HOLIDAY_PART_KEYS).size).toBe(10);
    expect(HOLIDAY_ALL_PART_KEYS).toEqual(expect.arrayContaining([...HOLIDAY_PART_KEYS, 'accessory:goldDreidelPin', 'accessory:goldOrnament', 'accessory:goldGeltMedal', 'accessory:goldBell']));
    expect(HOLIDAY_ALL_PART_KEYS).toHaveLength(14);
  });

  it('Given the 2027 Hanukkah window spilling into 2028, then the event key uses the start year', () => {
    const win = windowFor('hanukkah', '2028-01-01');
    expect(win).not.toBeNull();
    expect(eventKeyFor(win!)).toBe('hanukkah-2027');
  });
});
