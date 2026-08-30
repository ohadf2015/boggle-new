import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvBroadcastView from '@/host/components/TvBroadcastView';
import type { Language } from '@/shared/types/game';

// Mock SoundEffectsContext
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound: vi.fn(),
    setVolume: vi.fn(),
    volume: 0.7
  })
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => key
  })
}));

// Mock modules
vi.mock('@/host/hooks/useTvPlayerCombos', () => ({
  useTvPlayerCombos: () => ({ playerCombos: {} })
}));

vi.mock('@/host/hooks/useTvNotifications', () => ({
  useTvNotifications: () => ({
    notifications: [],
    dismissNotification: vi.fn()
  })
}));

vi.mock('@/host/hooks/useTvSounds', () => ({
  useTvSounds: () => ({ playSound: vi.fn() })
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false })
}));

// Mock fullscreen hook - this is what we're testing
const mockUseTvFullscreen = vi.fn();
vi.mock('@/host/hooks/useTvFullscreen', () => ({
  useTvFullscreen: (config: any) => mockUseTvFullscreen(config)
}));

// Mock TvGrid to avoid rendering complexity
vi.mock('@/host/components/tv-broadcast/TvGrid', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-grid-mock">Grid</div>
}));

// Mock TvLeaderboard
vi.mock('@/host/components/tv-broadcast/TvLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-leaderboard-mock">Leaderboard</div>
}));

// Mock TvTutorialOverlay
vi.mock('@/host/components/tv-broadcast/TvTutorialOverlay', () => ({
  __esModule: true,
  default: () => null,
  isTvTutorialComplete: () => true,
  TvHelpButton: () => <button data-testid="tv-help-button">Help</button>
}));

// Mock TvNotificationQueue
vi.mock('@/host/components/tv-broadcast/TvNotificationQueue', () => ({
  __esModule: true,
  default: () => null
}));

// Mock TvGameHeader
vi.mock('@/host/components/tv-broadcast/TvGameHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-game-header">Header</div>
}));

describe('TvBroadcastView - Join Bar Visibility', () => {
  const defaultProps = {
    gameCode: 'TEST123',
    username: 'HostUser',
    roomLanguage: 'en' as Language,
    roomName: 'Test Room',
    tableData: [],
    remainingTime: 60,
    timerValue: 3,
    playersReady: ['Player1', 'Player2'],
    playerScores: { Player1: 10, Player2: 5 },
    playerWordCounts: { Player1: 2, Player2: 1 },
    socket: null,
    t: (key: string) => {
      const translations: Record<string, string> = {
        'tvBroadcast.joinAt': 'Join at',
        'tvBroadcast.gameCode': 'Game Code',
        'tvBroadcast.players': 'Players',
        'tvBroadcast.enterFullscreen': 'Enter Fullscreen',
        'tvBroadcast.exitFullscreen': 'Exit Fullscreen',
        'tvBroadcast.waitingForGame': 'Waiting for game...'
      };
      return translations[key] || key;
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should display join bar when NOT in fullscreen mode', () => {
    // GIVEN: Not in fullscreen mode
    mockUseTvFullscreen.mockReturnValue({
      isFullscreen: false,
      toggleFullscreen: vi.fn(),
      isSupported: true
    });

    // WHEN: Component is rendered
    render(<TvBroadcastView {...defaultProps} />);

    // THEN: Join bar elements should be visible
    expect(screen.getByText('Join at')).toBeInTheDocument();
    // The address has to CARRY the code. A bare "lexiclash.live" has no
    // game-code input anywhere on it (verified on production 2026-08-30), so a
    // student who could not scan the QR had the code and nowhere to type it.
    expect(screen.getByText(/\/join\/TEST123$/)).toBeInTheDocument();
    expect(screen.getByText('Game Code')).toBeInTheDocument();
    expect(screen.getByText('TEST123')).toBeInTheDocument();
  });

  test('should keep join bar visible in fullscreen mode (FIXED)', () => {
    // GIVEN: In fullscreen mode
    mockUseTvFullscreen.mockReturnValue({
      isFullscreen: true,
      toggleFullscreen: vi.fn(),
      isSupported: true
    });

    // WHEN: Component is rendered
    render(<TvBroadcastView {...defaultProps} />);

    // THEN: Join bar SHOULD remain visible (this was the bug - join bar was hidden)
    expect(screen.getByText('Join at')).toBeInTheDocument();
    // The address has to CARRY the code. A bare "lexiclash.live" has no
    // game-code input anywhere on it (verified on production 2026-08-30), so a
    // student who could not scan the QR had the code and nowhere to type it.
    expect(screen.getByText(/\/join\/TEST123$/)).toBeInTheDocument();
    expect(screen.getByText('Game Code')).toBeInTheDocument();
    expect(screen.getByText('TEST123')).toBeInTheDocument();
  });
});
