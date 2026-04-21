/**
 * Tests for getLastSevenDaysCompletion — feeds the UI "last 7 days"
 * indicator used to surface DEDICATION (7-day) achievement progress.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/storageHelpers', () => ({
  getFromLocalStorage: vi.fn(),
  getJsonFromLocalStorage: vi.fn(() => null),
  saveJsonToLocalStorage: vi.fn(),
  removeFromLocalStorage: vi.fn(),
}));

vi.mock('../dateUtils', async () => {
  const actual = await vi.importActual<typeof import('../dateUtils')>('../dateUtils');
  return {
    ...actual,
    getDailyChallengeDate: () => '2026-04-21',
  };
});

import { getFromLocalStorage } from '@/utils/storageHelpers';
import { getLastSevenDaysCompletion } from '../storage';
import { getWordHuntResultKey, getWordWheelResultKey } from '../constants';

describe('getLastSevenDaysCompletion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 7 consecutive UTC dates oldest→newest ending today', () => {
    (getFromLocalStorage as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const result = getLastSevenDaysCompletion('en');

    expect(result).toHaveLength(7);
    expect(result.map((d) => d.date)).toEqual([
      '2026-04-15',
      '2026-04-16',
      '2026-04-17',
      '2026-04-18',
      '2026-04-19',
      '2026-04-20',
      '2026-04-21',
    ]);
  });

  it('marks wordHunt true only for dates with hunt key present', () => {
    const huntDates = ['2026-04-19', '2026-04-21'];
    (getFromLocalStorage as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      for (const d of huntDates) {
        if (key === getWordHuntResultKey('en', d)) return 'stored';
      }
      return null;
    });

    const result = getLastSevenDaysCompletion('en');
    const huntCompleted = result.filter((d) => d.wordHunt).map((d) => d.date);
    expect(huntCompleted).toEqual(['2026-04-19', '2026-04-21']);
    expect(result.every((d) => d.wordWheel === false)).toBe(true);
  });

  it('marks wordWheel independently of wordHunt', () => {
    (getFromLocalStorage as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === getWordWheelResultKey('he', '2026-04-20')) return 'stored';
      if (key === getWordHuntResultKey('he', '2026-04-18')) return 'stored';
      return null;
    });

    const result = getLastSevenDaysCompletion('he');
    const byDate = Object.fromEntries(result.map((d) => [d.date, d]));
    expect(byDate['2026-04-18'].wordHunt).toBe(true);
    expect(byDate['2026-04-18'].wordWheel).toBe(false);
    expect(byDate['2026-04-20'].wordHunt).toBe(false);
    expect(byDate['2026-04-20'].wordWheel).toBe(true);
  });

  it('returns all-false entries when nothing stored', () => {
    (getFromLocalStorage as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const result = getLastSevenDaysCompletion('sv');
    expect(result.every((d) => !d.wordHunt && !d.wordWheel)).toBe(true);
  });
});
