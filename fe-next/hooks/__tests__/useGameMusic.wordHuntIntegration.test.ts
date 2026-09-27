/**
 * Integration tests for useGameMusic with Word Hunt (survival mode) scenario
 *
 * This test simulates the actual production flow:
 * 1. Audio starts locked
 * 2. useGameMusic is called with phase='playing', earthquakeState='fire-round'
 * 3. fadeToTrack calls are queued
 * 4. Audio is unlocked
 * 5. Verify which track actually plays
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameMusic } from '../useGameMusic';

// Simulate the MusicContext behavior more accurately
const createMusicContextMock = () => {
  let audioUnlocked = false;
  const pendingTrack: { trackKey: string; fadeOutMs: number; fadeInMs: number } | null = null;
  const playedTracks: string[] = [];

  const mockFadeToTrack = vi.fn((trackKey: string, fadeOutMs?: number, fadeInMs?: number) => {
    // Simulate real MusicContext behavior:
    // When audio is NOT unlocked, the last call wins (overwrites previous pending)
    // When audio IS unlocked, immediately "play" the track
    if (audioUnlocked) {
      playedTracks.push(trackKey);
    }
    // If audio not unlocked, we just record the call but don't add to playedTracks
    // In real MusicContext, pendingUnlockTrackRef would store only the LAST request
  });

  const mockPlayTrack = vi.fn();

  const mockUnlockAudio = vi.fn(() => {
    audioUnlocked = true;
  });

  return {
    fadeToTrack: mockFadeToTrack,
    playTrack: mockPlayTrack,
    unlockAudio: mockUnlockAudio,
    TRACKS: {
      LOBBY: 'lobby' as const,
      BEFORE_GAME: 'beforeGame' as const,
      IN_GAME: 'inGame' as const,
      ALMOST_OUT_OF_TIME: 'almostOutOfTime' as const,
      BOSSA_ARCADE: 'bossaArcade' as const,
      BOSSA: 'bossa' as const,
    },
    playedTracks,
    isUnlocked: () => audioUnlocked,
  };
};

// Variable to hold mock instance for each test
let mockMusicContext: ReturnType<typeof createMusicContextMock>;

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => mockMusicContext,
}));

describe('useGameMusic - Word Hunt Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Create fresh mock for each test
    mockMusicContext = createMusicContextMock();
  });

  it('should call ONLY bossaArcade (not inGame) when earthquakeState is fire-round on mount', () => {
    // GIVEN: Word Hunt scenario - starts with phase='playing', earthquakeState='fire-round'

    // WHEN: The hook is mounted
    renderHook(() => useGameMusic({
      phase: 'playing',
      remainingTime: null,
      totalTime: 180,
      isPaused: false,
      enabled: true,
      earthquakeState: 'fire-round',
    }));

    // THEN: Analyze all fadeToTrack calls
    const allCalls = mockMusicContext.fadeToTrack.mock.calls;

    // The key assertion: IN_GAME should NOT be called at all
    // when earthquakeState is 'fire-round' on mount
    const inGameCalls = allCalls.filter(call => call[0] === 'inGame');
    const bossaArcadeCalls = allCalls.filter(call => call[0] === 'bossaArcade');

    console.log('All fadeToTrack calls:', JSON.stringify(allCalls, null, 2));
    console.log('inGame calls:', inGameCalls.length);
    console.log('bossaArcade calls:', bossaArcadeCalls.length);

    // CRITICAL: IN_GAME should NEVER be called when earthquakeState is 'fire-round'
    expect(inGameCalls).toHaveLength(0);

    // BOSSA_ARCADE should be called exactly once
    expect(bossaArcadeCalls).toHaveLength(1);
  });

  it('should call inGame when earthquakeState is idle on mount', () => {
    // GIVEN: Normal game scenario - starts with earthquakeState='idle'

    // WHEN: The hook is mounted
    renderHook(() => useGameMusic({
      phase: 'playing',
      remainingTime: 120,
      totalTime: 180,
      isPaused: false,
      enabled: true,
      earthquakeState: 'idle',
    }));

    // THEN: IN_GAME should be called, NOT BOSSA_ARCADE
    const allCalls = mockMusicContext.fadeToTrack.mock.calls;
    const inGameCalls = allCalls.filter(call => call[0] === 'inGame');
    const bossaArcadeCalls = allCalls.filter(call => call[0] === 'bossaArcade');

    expect(inGameCalls).toHaveLength(1);
    expect(bossaArcadeCalls).toHaveLength(0);
  });

  it('should NOT call bossaArcade when isPaused is true even with fire-round', () => {
    // GIVEN: Game is paused (e.g., game over state)

    // WHEN: The hook is mounted with isPaused=true
    renderHook(() => useGameMusic({
      phase: 'playing',
      remainingTime: null,
      totalTime: 180,
      isPaused: true, // Game is paused/over
      enabled: true,
      earthquakeState: 'fire-round',
    }));

    // THEN: Neither track should play for earthquake (phase effect might not play either)
    const allCalls = mockMusicContext.fadeToTrack.mock.calls;
    const bossaArcadeCalls = allCalls.filter(call => call[0] === 'bossaArcade');

    // When paused, earthquake effect should NOT trigger bossaArcade
    expect(bossaArcadeCalls).toHaveLength(0);
  });
});
