/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';

// Mock hooks that require providers
jest.mock('../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
    setLanguage: jest.fn(),
  }),
}));

jest.mock('../../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    showInviteButton: jest.fn(),
    hideInviteButton: jest.fn(),
    isInviteButtonVisible: false,
  }),
}));

// Mock usePullToRefresh to avoid DOM issues
jest.mock('../../hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));

// Mock RoomChat component since it requires LanguageProvider
jest.mock('../../components/RoomChat', () => ({
  __esModule: true,
  default: ({ className }: { className?: string }) => (
    <div data-testid="room-chat-mock" className={className}>Mock RoomChat</div>
  ),
}));

// Test: Multiplayer screens should have reasonable max-width constraints on desktop
// This prevents content from stretching too wide on large screens

describe('Multiplayer Screens Max Width', () => {
  describe('HostPreGameView', () => {
    it('should have max-width constraint on desktop via inner content', async () => {
      const { default: HostPreGameView } = await import('../../host/components/HostPreGameView');

      const mockProps = {
        gameCode: 'TEST123',
        roomLanguage: 'en' as const,
        language: 'en' as const,
        username: 'TestHost',
        t: (key: string) => key,
        timerValue: 2,
        setTimerValue: jest.fn(),
        timerDirection: 0,
        setTimerDirection: jest.fn(),
        difficulty: 'MEDIUM' as const,
        setDifficulty: jest.fn(),
        minWordLength: 2,
        setMinWordLength: jest.fn(),
        gameType: 'regular' as const,
        setGameType: jest.fn(),
        tournamentRounds: 3,
        setTournamentRounds: jest.fn(),
        tournamentData: null,
        hostPlaying: true,
        setHostPlaying: jest.fn(),
        playersReady: [],
        playerWordCounts: {},
        shufflingGrid: null,
        highlightedCells: [],
        tableData: [] as never,
        onStartGame: jest.fn(),
        onExitRoom: jest.fn(),
        onCancelTournament: jest.fn(),
        tournamentCreating: false,
      };

      const { container } = render(<HostPreGameView {...mockProps} />);

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
        setShowQR: jest.fn(),
        showExitConfirm: false,
        setShowExitConfirm: jest.fn(),
        onExitRoom: jest.fn(),
        onConfirmExit: jest.fn(),
      };

      const { container } = render(<PlayerWaitingView {...mockProps} />);

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
        onRefreshRooms: jest.fn(),
        onRoomClick: jest.fn(),
        onCreateRoom: jest.fn(),
      };

      const { container } = render(<RoomListView {...mockProps} />);

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
