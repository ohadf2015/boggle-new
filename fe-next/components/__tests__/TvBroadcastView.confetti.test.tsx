/**
 * TvBroadcastView confetti: verifies PNG overlay removed, canvas-confetti used instead.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Language } from '@/shared/types/game';

// Capture the onNotification callback from useTvNotifications
let capturedOnNotification: ((n: any) => void) | undefined;

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn(), setVolume: vi.fn(), volume: 0.7 }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}));

vi.mock('@/host/hooks/useTvPlayerCombos', () => ({
  useTvPlayerCombos: () => ({ playerCombos: {} }),
}));

vi.mock('@/host/hooks/useTvNotifications', () => ({
  useTvNotifications: (opts: any) => {
    capturedOnNotification = opts.onNotification;
    return { notifications: [], dismissNotification: vi.fn() };
  },
}));

vi.mock('@/host/hooks/useTvSounds', () => ({
  useTvSounds: () => ({ playSound: vi.fn() }),
}));

vi.mock('@/host/hooks/useTvFullscreen', () => ({
  useTvFullscreen: () => ({ isFullscreen: false, toggleFullscreen: vi.fn(), containerRef: { current: null } }),
}));

vi.mock('@/host/hooks/useTvFinalMinute', () => ({
  useTvFinalMinute: () => ({ isFinalMinute: false }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => 'classic',
  useHostSelectedGameMode: () => 'random',
  useWordHuntPlayerLives: () => ({}),
  useWordHuntEliminatedPlayers: () => [],
  useWordHuntTargetLength: () => 0,
}));

// Mock heavy child components
vi.mock('@/host/components/tv-broadcast/TvGrid', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('@/host/components/tv-broadcast/TvLeaderboard', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('@/host/components/tv-broadcast/TvActivityPanel', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('@/host/components/tv-broadcast/TvMomentumTicker', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('@/host/components/tv-broadcast/TvNotificationQueue', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('@/host/components/tv-broadcast/TvJoinBar', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('@/host/components/tv-broadcast/TvGameHeader', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('@/host/components/tv-broadcast/TvTutorialOverlay', () => ({
  __esModule: true,
  default: () => <div />,
  TvHelpButton: () => <div />,
}));

// Mock confetti util — track calls
const mockFireConfetti = vi.fn();
vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: (...args: any[]) => mockFireConfetti(...args),
}));

import TvBroadcastView from '@/host/components/TvBroadcastView';

const mockSocket = { on: vi.fn(), off: vi.fn(), emit: vi.fn() } as any;

const baseProps = {
  socket: mockSocket,
  gameCode: 'TEST',
  username: 'host',
  roomLanguage: 'en' as Language,
  tableData: [['A', 'B'], ['C', 'D']] as any,
  playersReady: [{ username: 'alice', avatar: undefined }],
  playerScores: { alice: 100 },
  playerWordCounts: { alice: 5 },
  remainingTime: 60,
  timerValue: 2,
  t: (k: string) => k,
};

describe('TvBroadcastView confetti', () => {
  beforeEach(() => {
    capturedOnNotification = undefined;
    mockFireConfetti.mockClear();
  });

  it('does NOT render a confetti PNG image', () => {
    render(<TvBroadcastView {...baseProps} />);
    // The old implementation rendered an <img> with the confetti PNG
    const confettiImg = document.querySelector('img[src*="confetti"]');
    expect(confettiImg).toBeNull();
  });

  it('fires canvas-confetti on mega notification', () => {
    render(<TvBroadcastView {...baseProps} />);
    expect(capturedOnNotification).toBeDefined();

    act(() => {
      capturedOnNotification!({ tier: 'mega', message: 'Mega combo!' });
    });

    expect(mockFireConfetti).toHaveBeenCalled();
  });

  it('does NOT fire confetti on non-mega notifications', () => {
    render(<TvBroadcastView {...baseProps} />);

    act(() => {
      capturedOnNotification!({ tier: 'normal', message: 'Word found' });
    });

    expect(mockFireConfetti).not.toHaveBeenCalled();
  });
});
