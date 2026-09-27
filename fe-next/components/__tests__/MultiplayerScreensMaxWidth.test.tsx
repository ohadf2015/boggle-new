/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MusicProvider } from '../../contexts/MusicContext';

// Mock hooks that require providers
vi.mock('../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
  useSocketOptional: () => ({ socket: null }),
}));

vi.mock('@/hooks/gameState', () => ({ useGameMode: () => 'classic', useHostSelectedGameMode: () => 'random', useGameActions: () => ({ setGameActive: vi.fn(), setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }) }));
vi.mock('@/components/ads/RewardedAdGoldButton', () => ({ __esModule: true, default: () => null, RewardedAdGoldButton: () => null }));
vi.mock('@/lib/animation/presets', () => ({ SPRING_PRESETS: { balanced: { type: 'spring', stiffness: 300, damping: 26 } } }));
vi.mock('@/utils/profileStorage', () => ({ getOrCreateStoredCustomAvatar: () => null, setStoredCustomAvatar: vi.fn() }));
vi.mock('@/hooks/useAvatarPremium', () => ({ useAvatarPremium: () => ({ isPremium: false }) }));
vi.mock('@/components/avatar/AvatarBuilderModal', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/boosts/BoostButton', () => ({ BoostButton: () => null }));
vi.mock('@/components/boosts/BoostPicker', () => ({ BoostPicker: () => null }));

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
    setLanguage: vi.fn(),
  }),
}));

vi.mock('../../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    showInviteButton: vi.fn(),
    hideInviteButton: vi.fn(),
    isInviteButtonVisible: false,
  }),
}));

// Mock usePullToRefresh to avoid DOM issues
vi.mock('../../hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));

// Mock RoomChat component since it requires LanguageProvider
vi.mock('../../components/RoomChat', () => ({
  __esModule: true,
  default: ({ className }: { className?: string }) => (
    <div data-testid="room-chat-mock" className={className}>Mock RoomChat</div>
  ),
}));

// Test: Multiplayer screens should have reasonable max-width constraints on desktop
// This prevents content from stretching too wide on large screens


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('Multiplayer Screens Max Width', () => {
  describe('HostPreGameView', () => {
    it('should have max-width constraint on desktop via inner content', { timeout: 30000 }, async () => {
      const { default: HostPreGameView } = await import('../../host/components/HostPreGameView');

      const mockProps = {
        gameCode: 'TEST123',
        roomLanguage: 'en' as const,
        language: 'en' as const,
        username: 'TestHost',
        t: (key: string) => key,
        timerValue: 2,
        setTimerValue: vi.fn(),
        timerDirection: 0,
        setTimerDirection: vi.fn(),
        difficulty: 'MEDIUM' as const,
        setDifficulty: vi.fn(),
        minWordLength: 2,
        setMinWordLength: vi.fn(),
        gameType: 'regular' as const,
        setGameType: vi.fn(),
        tournamentRounds: 3,
        setTournamentRounds: vi.fn(),
        tournamentData: null,
        hostPlaying: true,
        setHostPlaying: vi.fn(),
        playersReady: [],
        playerWordCounts: {},
        shufflingGrid: null,
        highlightedCells: [],
        tableData: [] as never,
        onStartGame: vi.fn(),
        onExitRoom: vi.fn(),
        onCancelTournament: vi.fn(),
        tournamentCreating: false,
      };

      const { container } = render(<MusicProvider><HostPreGameView {...mockProps} /></MusicProvider>, { wrapper: createWrapper() });

      // The root should have a max-width constraint for desktop
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).toBeTruthy();

      // Check for max-width class on root or immediate children
      // We expect lg:max-w-2xl or similar desktop constraint
      const hasMaxWidthConstraint =
        rootDiv.className.includes('lg:max-w-') ||
        rootDiv.className.includes('max-w-') ||
        (rootDiv.querySelector('[class*="lg:max-w-"]') !== null);

      expect(hasMaxWidthConstraint).toBe(true);
    });
  });

  describe('PlayerWaitingView', () => {
    it('should have max-width constraint on desktop', async () => {
      const { default: PlayerWaitingView } = await import('../../player/components/PlayerWaitingView');

      const mockProps = {
        gameCode: 'TEST123',
        gameLanguage: 'en' as const,
        username: 'TestPlayer',
        t: (key: string) => key,
        playersReady: [],
        showQR: false,
        setShowQR: vi.fn(),
        showExitConfirm: false,
        setShowExitConfirm: vi.fn(),
        onExitRoom: vi.fn(),
        onConfirmExit: vi.fn(),
      };

      const { container } = render(<MusicProvider><PlayerWaitingView {...mockProps} /></MusicProvider>, { wrapper: createWrapper() });

      // The root container should have max-width constraint for desktop
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).toBeTruthy();

      // Check for max-width constraint on root - expect lg:max-w-2xl or similar
      const hasMaxWidthConstraint =
        rootDiv.className.includes('lg:max-w-') ||
        rootDiv.className.includes('max-w-') ||
        (rootDiv.querySelector('[class*="lg:max-w-"]') !== null);

      expect(hasMaxWidthConstraint).toBe(true);
    });
  });

  describe('RoomListView', () => {
    it('should have max-width constraint on main content', async () => {
      const { default: RoomListView } = await import('../multiplayer/RoomListView');

      const mockProps = {
        activeRooms: [],
        roomsLoading: false,
        onRefreshRooms: vi.fn(),
        onRoomClick: vi.fn(),
        onCreateRoom: vi.fn(),
      };

      const { container } = render(<RoomListView {...mockProps} />, { wrapper: createWrapper() });

      // The component should have max-width constraint on main content area
      const contentArea = container.querySelector('[class*="flex-1"]');
      expect(contentArea).toBeTruthy();

      // Check for any max-width constraint in the component tree
      const hasMaxWidthConstraint =
        container.querySelector('[class*="lg:max-w-"]') !== null ||
        container.querySelector('[class*="max-w-"]') !== null;

      expect(hasMaxWidthConstraint).toBe(true);
    });
  });
});
