import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { dailyBestKey } from '@/lib/wordTower/dailyBest';
import { utcDateKey } from '@/lib/wordTower/dailySeed';
import { getWordHuntResultKey, getWordWheelResultKey, WORD_HUNT_FORFEIT_KEY } from '@/utils/dailyChallenge/constants';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));

import { useDailyPlayedStatus } from '../useDailyPlayedStatus';

describe('useDailyPlayedStatus — guest on the client', () => {
  // The flags were read from `wh_played_<date>` / `ww_played_<date>` /
  // `connections_played_<date>` — keys nothing in the app ever writes. Every
  // guest therefore looked like they had played nothing, so the end-of-game
  // handoff looped a guest back into Word Wheel after Word Tower and never
  // reached "all clear". These tests write through the REAL storage keys.
  it('given this device finished Word Hunt today, reports it on the first committed render', () => {
    localStorage.clear();
    localStorage.setItem(getWordHuntResultKey('he', getDailyChallengeDate()), '{"solved":true}');
    const { result } = renderHook(() => useDailyPlayedStatus());
    expect(result.current.today.wordHunt).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('given this device climbed today\'s daily Word Tower, reports Word Tower as played', () => {
    localStorage.clear();
    localStorage.setItem(dailyBestKey(utcDateKey()), '12');
    const { result } = renderHook(() => useDailyPlayedStatus());
    expect(result.current.today.wordTower).toBe(true);
  });

  it('given no tower climb today (or a stale zero), Word Tower is not played', () => {
    localStorage.clear();
    localStorage.setItem(dailyBestKey(utcDateKey()), '0');
    const { result } = renderHook(() => useDailyPlayedStatus());
    expect(result.current.today.wordTower).toBe(false);
  });

  it('given this device finished today\'s Word Wheel (in any language), reports Word Wheel as played', () => {
    localStorage.clear();
    localStorage.setItem(getWordWheelResultKey('sv', getDailyChallengeDate()), '{"score":10}');
    const { result } = renderHook(() => useDailyPlayedStatus());
    expect(result.current.today.wordWheel).toBe(true);
  });

  it('given this device finished today\'s Connections, reports Connections as played', () => {
    localStorage.clear();
    localStorage.setItem('connections-daily-played', utcDateKey());
    const { result } = renderHook(() => useDailyPlayedStatus());
    expect(result.current.today.connections).toBe(true);
  });

  it('given only a Word Hunt forfeit marker (no result), Word Hunt is not played', () => {
    localStorage.clear();
    localStorage.setItem(`${WORD_HUNT_FORFEIT_KEY}_en_${getDailyChallengeDate()}`, '1');
    const { result } = renderHook(() => useDailyPlayedStatus());
    expect(result.current.today.wordHunt).toBe(false);
  });

  it('given yesterday\'s results only, nothing is played today', () => {
    localStorage.clear();
    localStorage.setItem(getWordHuntResultKey('en', '2020-01-01'), '{}');
    localStorage.setItem(getWordWheelResultKey('en', '2020-01-01'), '{}');
    localStorage.setItem('connections-daily-played', '2020-01-01');
    const { result } = renderHook(() => useDailyPlayedStatus());
    expect(result.current.today).toEqual({ wordHunt: false, wordWheel: false, wordTower: false, connections: false });
  });
});
