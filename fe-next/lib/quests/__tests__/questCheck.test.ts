import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestQuestCheck, onQuestCheck, QUEST_CHECK_DELAYS_MS } from '../questCheck';

describe('quest check signal', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('given a game just ended, when a check is requested, then quests refetch at once and again on the retry ladder', () => {
    const refetch = vi.fn();
    const off = onQuestCheck(refetch);
    requestQuestCheck();
    vi.advanceTimersByTime(0);
    expect(refetch).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(QUEST_CHECK_DELAYS_MS[QUEST_CHECK_DELAYS_MS.length - 1]);
    expect(refetch).toHaveBeenCalledTimes(QUEST_CHECK_DELAYS_MS.length);
    off();
  });

  it('given checks requested back to back, then the ladder restarts instead of stacking', () => {
    const refetch = vi.fn();
    const off = onQuestCheck(refetch);
    requestQuestCheck();
    requestQuestCheck();
    vi.advanceTimersByTime(10_000);
    expect(refetch).toHaveBeenCalledTimes(QUEST_CHECK_DELAYS_MS.length);
    off();
  });

  it('stops refetching once unsubscribed', () => {
    const refetch = vi.fn();
    const off = onQuestCheck(refetch);
    requestQuestCheck();
    off();
    vi.advanceTimersByTime(10_000);
    expect(refetch).not.toHaveBeenCalled();
  });
});
