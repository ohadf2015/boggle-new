import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SUPPORTED_GAME_LANGUAGES } from '@/lib/languageConfig';

// The hook composes a live-room socket hook + a Supabase round-trip. Neither is
// relevant to the static-count assertions below, so stub both.
vi.mock('../useLiveRoomStats', () => ({
  useLiveRoomStats: () => ({
    activePlayers: 0,
    openRooms: 0,
    totalPlayers: 0,
    isLoading: false,
    refresh: () => {},
  }),
}));
vi.mock('@/lib/supabase', () => ({ supabase: null }));

import { useLandingStats } from '../useLandingStats';

describe('useLandingStats', () => {
  it('reports the real number of supported game languages — not a stale hardcode', () => {
    // GIVEN the app ships SUPPORTED_GAME_LANGUAGES (en, he, sv, ja, es, ru)
    // WHEN the landing stats resolve
    const { result } = renderHook(() => useLandingStats({ initialGamesToday: 0 }));
    // THEN the languages stat matches the single source of truth, not "5".
    expect(result.current.languages).toBe(SUPPORTED_GAME_LANGUAGES.length);
    expect(result.current.languages).toBeGreaterThanOrEqual(6);
  });
});
