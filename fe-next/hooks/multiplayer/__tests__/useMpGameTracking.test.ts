/**
 * Test: MP game tracking via growthTracking
 * Verifies that MP game start/end emit correct PostHog events with gameMode + isMultiplayer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { trackGameStart, trackGameEnd } from '@/utils/growthTracking';

// Mock posthog
vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
  }
}));

vi.mock('@/utils/posthogEngagement', () => ({
  setPostHogUserProps: vi.fn(),
  setPostHogUserPropsOnce: vi.fn(),
  incrementPostHogUserProp: vi.fn(),
  trackRageQuit: vi.fn(),
  trackSessionDepth: vi.fn(),
}));

vi.mock('@/utils/abandonOnPagehide', () => ({
  markGameActive: vi.fn(),
  markGameInactive: vi.fn(),
}));

vi.mock('@/components/GoogleAnalytics', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }
}));

import posthog from 'posthog-js';

describe('MP game tracking - PostHog events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('should emit game_started with gameMode and isMultiplayer:true for MP classic', () => {
    trackGameStart('classic', {
      isMultiplayer: true,
      gameMode: 'classic',
      engineMode: 'multiplayer',
      playerCount: 3,
      gameCode: 'ABC123',
      roundIndex: 0,
    });

    const calls = (posthog.capture as ReturnType<typeof vi.fn>).mock.calls;
    // Find the game_started event (could be prefixed with 'growth:')
    const gameStartedCall = calls.find(
      call => call[0] === 'game_started' || call[0] === 'growth:game_started'
    );

    expect(gameStartedCall).toBeDefined();
    const [eventName, eventProps] = gameStartedCall!;

    expect(eventProps).toMatchObject({
      isMultiplayer: true,
      gameMode: 'classic',
      engineMode: 'multiplayer',
      playerCount: 3,
      gameCode: 'ABC123',
      roundIndex: 0,
    });
  });

  it('should emit game_started with gameMode=blast for MP blast mode', () => {
    trackGameStart('blast', {
      isMultiplayer: true,
      gameMode: 'blast',
      engineMode: 'multiplayer',
      playerCount: 2,
      gameCode: 'XYZ789',
      roundIndex: 1,
    });

    const calls = (posthog.capture as ReturnType<typeof vi.fn>).mock.calls;
    const gameStartedCall = calls.find(
      call => call[0] === 'game_started' || call[0] === 'growth:game_started'
    );

    expect(gameStartedCall).toBeDefined();
    const [, eventProps] = gameStartedCall!;

    expect(eventProps.gameMode).toBe('blast');
    expect(eventProps.isMultiplayer).toBe(true);
  });

  it('should emit game_completed with gameMode + isMultiplayer:true', () => {
    trackGameEnd('classic', 250, 12, true, 120, {
      isMultiplayer: true,
      gameMode: 'classic',
      engineMode: 'multiplayer',
      playerCount: 4,
      gameCode: 'DEF456',
      roundIndex: 0,
    });

    const calls = (posthog.capture as ReturnType<typeof vi.fn>).mock.calls;
    const gameCompletedCall = calls.find(
      call => call[0] === 'game_completed' || call[0] === 'growth:game_completed'
    );

    expect(gameCompletedCall).toBeDefined();
    const [, eventProps] = gameCompletedCall!;

    expect(eventProps).toMatchObject({
      isMultiplayer: true,
      gameMode: 'classic',
      engineMode: 'multiplayer',
      playerCount: 4,
      gameCode: 'DEF456',
      roundIndex: 0,
      score: 250,
      wordCount: 12,
      durationSec: 120,
    });
  });

  it('should emit game_completed for word-hunt with correct properties', () => {
    trackGameEnd('word-hunt', 180, 8, true, 90, {
      isMultiplayer: true,
      gameMode: 'word-hunt',
      engineMode: 'multiplayer',
      playerCount: 3,
      gameCode: 'WH2026',
      roundIndex: 2,
    });

    const calls = (posthog.capture as ReturnType<typeof vi.fn>).mock.calls;
    const gameCompletedCall = calls.find(
      call => call[0] === 'game_completed' || call[0] === 'growth:game_completed'
    );

    expect(gameCompletedCall).toBeDefined();
    const [, eventProps] = gameCompletedCall!;

    expect(eventProps.gameMode).toBe('word-hunt');
    expect(eventProps.isMultiplayer).toBe(true);
    expect(eventProps.roundIndex).toBe(2);
  });
});
