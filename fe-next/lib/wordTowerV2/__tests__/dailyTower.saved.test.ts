import { describe, it, expect } from 'vitest';
import { emptySave, hasSavedDailyTower, saveDailyTower } from '../dailyTower';

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('hasSavedDailyTower', () => {
  it('is true when the language has a tower saved from an earlier visit', () => {
    const storage = memory();
    saveDailyTower({ ...emptySave('he'), words: ['שלום'] }, storage);
    expect(hasSavedDailyTower('he', storage)).toBe(true);
    expect(hasSavedDailyTower('en', storage)).toBe(false);
  });

  it('is false with no storage or an empty save', () => {
    const storage = memory();
    saveDailyTower(emptySave('he'), storage);
    expect(hasSavedDailyTower('he', storage)).toBe(false);
    expect(hasSavedDailyTower('he', null)).toBe(false);
  });
});
