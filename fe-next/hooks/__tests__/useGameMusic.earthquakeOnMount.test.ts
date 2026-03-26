/**
 * Tests for useGameMusic earthquake/fire-round music priority on mount
 *
 * Bug: When Word Hunt starts with earthquakeState='fire-round',
 * the hook plays IN_GAME music first, then queues BOSSA_ARCADE.
 * Expected: BOSSA_ARCADE should play immediately when earthquakeState
 * is not 'idle' on mount.
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameMusic } from '../useGameMusic';

// Mock MusicContext
const { mockFadeToTrack, mockPlayTrack } = vi.hoisted(() => {
  const mockFadeToTrack = vi.fn();
  const mockPlayTrack = vi.fn();
  return { mockFadeToTrack, mockPlayTrack };
});
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    fadeToTrack: mockFadeToTrack,
    playTrack: mockPlayTrack,
    TRACKS: {
      LOBBY: 'lobby',
      BEFORE_GAME: 'beforeGame',
      IN_GAME: 'inGame',
      ALMOST_OUT_OF_TIME: 'almostOutOfTime',
      BOSSA_ARCADE: 'bossaArcade',
      BOSSA: 'bossa',
    },
  }),
}));

describe('useGameMusic - Earthquake Music Priority on Mount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should play BOSSA_ARCADE immediately when earthquakeState is fire-round on mount', () => {
    // GIVEN: Word Hunt starts with phase='playing' and earthquakeState='fire-round'
    // (This is the state when DailyWordHuntSurvival mounts)

    // WHEN: The hook is mounted
    renderHook(() => useGameMusic({
      phase: 'playing',
      remainingTime: null,
      totalTime: 180,
      isPaused: false,
      enabled: true,
      earthquakeState: 'fire-round',
    }));

    // THEN: Should play BOSSA_ARCADE, NOT IN_GAME
    // The first call should be bossaArcade (not inGame)
    expect(mockFadeToTrack).toHaveBeenCalled();

    // Get all calls
    const allCalls = mockFadeToTrack.mock.calls;

    // Should NOT have called fadeToTrack with IN_GAME at all
    // when earthquakeState is already 'fire-round' on mount
    const inGameCalls = allCalls.filter((call: unknown[]) => call[0] === 'inGame');
    expect(inGameCalls).toHaveLength(0);

    // Should have called fadeToTrack with BOSSA_ARCADE
    const bossaArcadeCalls = allCalls.filter((call: unknown[]) => call[0] === 'bossaArcade');
    expect(bossaArcadeCalls).toHaveLength(1);
  });

  it('should play IN_GAME when earthquakeState is idle on mount', () => {
    // GIVEN: Normal game (not Word Hunt) with earthquakeState='idle'

    // WHEN: The hook is mounted
    renderHook(() => useGameMusic({
      phase: 'playing',
      remainingTime: 120,
      totalTime: 180,
      isPaused: false,
      enabled: true,
      earthquakeState: 'idle',
    }));

    // THEN: Should play IN_GAME
    expect(mockFadeToTrack).toHaveBeenCalledWith('inGame', 800, 800);

    // Should NOT have called bossaArcade
    const allCalls = mockFadeToTrack.mock.calls;
    const bossaArcadeCalls = allCalls.filter((call: unknown[]) => call[0] === 'bossaArcade');
    expect(bossaArcadeCalls).toHaveLength(0);
  });
});
