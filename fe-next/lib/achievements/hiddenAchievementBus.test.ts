/**
 * Test: hidden-achievement bus — dedup → dispatch CustomEvent + light analytics,
 * plus evaluate* convenience that runs the pure detectors and triggers each hit.
 */

import { vi } from 'vitest';
import {
  HIDDEN_ACHIEVEMENT_EVENT,
  triggerHiddenAchievement,
  evaluateSelectionAchievements,
  evaluateWordAchievements,
} from './hiddenAchievementBus';

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEvent(...args),
}));

describe('triggerHiddenAchievement', () => {
  beforeEach(() => {
    localStorage.clear();
    trackGrowthEvent.mockClear();
  });

  it('dispatches the bus event with the id on first earn and returns true', () => {
    const seen: string[] = [];
    const handler = (e: Event) => seen.push((e as CustomEvent).detail.id);
    window.addEventListener(HIDDEN_ACHIEVEMENT_EVENT, handler);

    const earned = triggerHiddenAchievement('board_sweep');

    window.removeEventListener(HIDDEN_ACHIEVEMENT_EVENT, handler);
    expect(earned).toBe(true);
    expect(seen).toEqual(['board_sweep']);
    expect(trackGrowthEvent).toHaveBeenCalledTimes(1);
  });

  it('does not re-dispatch or re-track an already-earned id', () => {
    triggerHiddenAchievement('palindrome');
    trackGrowthEvent.mockClear();

    const seen: string[] = [];
    const handler = (e: Event) => seen.push((e as CustomEvent).detail.id);
    window.addEventListener(HIDDEN_ACHIEVEMENT_EVENT, handler);

    const earned = triggerHiddenAchievement('palindrome');

    window.removeEventListener(HIDDEN_ACHIEVEMENT_EVENT, handler);
    expect(earned).toBe(false);
    expect(seen).toEqual([]);
    expect(trackGrowthEvent).not.toHaveBeenCalled();
  });
});

describe('evaluate* convenience runs detectors + triggers', () => {
  beforeEach(() => {
    localStorage.clear();
    trackGrowthEvent.mockClear();
  });

  it('selection: a full-board drag triggers board_sweep', () => {
    const seen: string[] = [];
    const handler = (e: Event) => seen.push((e as CustomEvent).detail.id);
    window.addEventListener(HIDDEN_ACHIEVEMENT_EVENT, handler);

    evaluateSelectionAchievements({ selectedTileCount: 16, totalTiles: 16 });

    window.removeEventListener(HIDDEN_ACHIEVEMENT_EVENT, handler);
    expect(seen).toEqual(['board_sweep']);
  });

  it('word: a palindrome triggers palindrome', () => {
    const seen: string[] = [];
    const handler = (e: Event) => seen.push((e as CustomEvent).detail.id);
    window.addEventListener(HIDDEN_ACHIEVEMENT_EVENT, handler);

    evaluateWordAchievements({ word: 'noon', validWordTimesSec: [3] });

    window.removeEventListener(HIDDEN_ACHIEVEMENT_EVENT, handler);
    expect(seen).toEqual(['palindrome']);
  });

  it('word: nothing qualifying triggers nothing', () => {
    const seen: string[] = [];
    const handler = (e: Event) => seen.push((e as CustomEvent).detail.id);
    window.addEventListener(HIDDEN_ACHIEVEMENT_EVENT, handler);

    evaluateWordAchievements({ word: 'word', validWordTimesSec: [3] });

    window.removeEventListener(HIDDEN_ACHIEVEMENT_EVENT, handler);
    expect(seen).toEqual([]);
  });
});
