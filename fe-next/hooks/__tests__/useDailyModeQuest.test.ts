import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getTodayKey,
  loadQuestData,
  saveQuestData,
  getDateReward,
  markModePlayedLogic,
  isQuestCompletedLogic,
  claimRewardLogic,
  getQuestProgressLogic,
} from '../useDailyModeQuest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('useDailyModeQuest', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-31T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial state with all modes false and not completed', () => {
    const progress = getQuestProgressLogic();
    expect(progress.blast).toBe(false);
    expect(progress.classicMp).toBe(false);
    expect(progress.wordHuntMp).toBe(false);
    expect(progress.completed).toBe(false);
  });

  it('marks a single mode as played', () => {
    markModePlayedLogic('blast');
    const progress = getQuestProgressLogic();
    expect(progress.blast).toBe(true);
    expect(progress.classicMp).toBe(false);
    expect(progress.completed).toBe(false);
  });

  it('completes quest when all 3 modes played', () => {
    markModePlayedLogic('blast');
    markModePlayedLogic('classicMp');
    markModePlayedLogic('wordHuntMp');
    expect(isQuestCompletedLogic()).toBe(true);
    expect(getQuestProgressLogic().completed).toBe(true);
  });

  it('auto-resets at next UTC day', () => {
    markModePlayedLogic('blast');
    markModePlayedLogic('classicMp');
    markModePlayedLogic('wordHuntMp');
    expect(isQuestCompletedLogic()).toBe(true);

    // Advance to next day
    vi.setSystemTime(new Date('2026-04-01T00:00:01Z'));
    const progress = getQuestProgressLogic();
    expect(progress.blast).toBe(false);
    expect(progress.completed).toBe(false);
  });

  it('returns deterministic reward seeded by date', () => {
    markModePlayedLogic('blast');
    markModePlayedLogic('classicMp');
    markModePlayedLogic('wordHuntMp');
    const reward1 = claimRewardLogic();

    // Clear and redo - same date same reward
    localStorageMock.clear();
    markModePlayedLogic('blast');
    markModePlayedLogic('classicMp');
    markModePlayedLogic('wordHuntMp');
    const reward2 = claimRewardLogic();

    expect(reward1).toBeGreaterThanOrEqual(50);
    expect(reward1).toBeLessThanOrEqual(150);
    expect(reward1).toBe(reward2);
  });

  it('cannot claim reward twice on same day', () => {
    markModePlayedLogic('blast');
    markModePlayedLogic('classicMp');
    markModePlayedLogic('wordHuntMp');

    const firstClaim = claimRewardLogic();
    expect(firstClaim).toBeGreaterThanOrEqual(50);

    const secondClaim = claimRewardLogic();
    expect(secondClaim).toBeNull();
  });

  it('cannot claim reward if quest not completed', () => {
    markModePlayedLogic('blast');
    const reward = claimRewardLogic();
    expect(reward).toBeNull();
  });

  it('reward claimed state persists via localStorage', () => {
    markModePlayedLogic('blast');
    markModePlayedLogic('classicMp');
    markModePlayedLogic('wordHuntMp');
    claimRewardLogic();

    // Verify from fresh read
    expect(getQuestProgressLogic().completed).toBe(true);
    expect(claimRewardLogic()).toBeNull();
  });

  // New test: blast mode is included in the quest set
  it('includes blast mode in the quest set', () => {
    const progress = getQuestProgressLogic();
    expect(progress).toHaveProperty('blast');
    expect(typeof progress.blast).toBe('boolean');
  });

  // New test: completing blast game credits the blast quest
  it('credits blast quest when blast mode is played', () => {
    expect(getQuestProgressLogic().blast).toBe(false);
    markModePlayedLogic('blast');
    expect(getQuestProgressLogic().blast).toBe(true);
  });
});
