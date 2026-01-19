/**
 * Test: Multiplayer Desktop Functionality Access
 *
 * BUG: Bottom tabs (players/chat navigation) are hidden on desktop with lg:hidden,
 * which means desktop users cannot access chat or switch between tabs.
 *
 * Requirements:
 * 1. Desktop users must have access to all functionality (players list, chat)
 * 2. Either show content side-by-side OR provide alternative navigation on desktop
 * 3. Mobile keeps bottom tab navigation
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Socket context
jest.mock('../../utils/SocketContext', () => ({
  useSocket: () => ({
    socket: null,
    isConnected: true,
  }),
}));

// Mock framer-motion with all motion element types used by components
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
      <button className={className} {...props}>{children}</button>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useCrazyGamesInvite
jest.mock('../../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    showInviteButton: jest.fn(),
    hideInviteButton: jest.fn(),
    isInviteButtonVisible: false,
  }),
}));

// Mock qrcode.react
jest.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="qr-code">QR Code</div>,
}));

// Mock RoomChat component since it requires LanguageProvider
jest.mock('../../components/RoomChat', () => ({
  __esModule: true,
  default: ({ className }: { className?: string }) => (
    <div data-testid="room-chat-mock" className={className}>Mock RoomChat</div>
  ),
}));

// Mock BotControls component since it requires LanguageProvider
jest.mock('../../components/BotControls', () => ({
  __esModule: true,
  default: () => <div data-testid="bot-controls-mock">Mock BotControls</div>,
}));

import HostPreGameView from '../../host/components/HostPreGameView';
import PlayerWaitingView from '../../player/components/PlayerWaitingView';

const mockT = (key: string) => key;

describe('Multiplayer Desktop Functionality Access', () => {
  describe('HostPreGameView', () => {
    const defaultHostProps = {
      gameCode: 'ABC123',
      roomLanguage: 'en' as const,
      language: 'en' as const,
      username: 'TestHost',
      t: mockT,
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
      playersReady: [{ username: 'TestHost', isHost: true }],
      playerWordCounts: {},
      shufflingGrid: null,
      highlightedCells: [],
      tableData: [['A', 'B'], ['C', 'D']],
      onStartGame: jest.fn(),
      onExitRoom: jest.fn(),
      onCancelTournament: jest.fn(),
      onRegenerateBoard: jest.fn(),
      tournamentCreating: false,
    };

    it('should show chat content on desktop (not hidden behind tabs)', () => {
      render(<HostPreGameView {...defaultHostProps} />);

      // On desktop, the RoomChat component should be rendered and visible
      // It should NOT require clicking a mobile tab to access
      // The chat should either be:
      // 1. Rendered alongside the lobby content (side-by-side)
      // 2. Or have desktop-specific navigation

      // Find the desktop layout container that shows both lobby and chat
      const desktopChatArea = screen.queryByTestId('desktop-chat-area');

      // On desktop, chat should be accessible without needing the mobile tab bar
      // This test will FAIL with current implementation because chat is only
      // accessible via the mobile tab bar which has lg:hidden
      expect(desktopChatArea).toBeInTheDocument();
    });

    it('should have a visible start game button on desktop', () => {
      render(<HostPreGameView {...defaultHostProps} />);

      // Desktop should have a start button that is visible
      // Now we have TWO start buttons: one in desktop layout, one in mobile layout
      const startButtons = screen.getAllByRole('button', { name: /startGame/i });

      // Verify at least one start button exists
      expect(startButtons.length).toBeGreaterThanOrEqual(1);

      // Find the desktop start button (one that is NOT inside lg:hidden container)
      const desktopStartButton = startButtons.find((btn) => {
        // Walk up the DOM to check if any ancestor has lg:hidden
        let parent = btn.parentElement;
        while (parent) {
          if (parent.className?.includes('lg:hidden')) {
            return false; // This button is hidden on desktop
          }
          parent = parent.parentElement;
        }
        return true; // This button is visible on desktop
      });

      // There must be at least one button visible on desktop
      expect(desktopStartButton).toBeTruthy();
    });
  });

  describe('PlayerWaitingView', () => {
    const defaultPlayerProps = {
      gameCode: 'ABC123',
      gameLanguage: 'en' as const,
      username: 'TestPlayer',
      t: mockT,
      playersReady: [
        { username: 'TestHost', isHost: true },
        { username: 'TestPlayer', isHost: false },
      ],
      showQR: false,
      setShowQR: jest.fn(),
      showExitConfirm: false,
      setShowExitConfirm: jest.fn(),
      onExitRoom: jest.fn(),
      onConfirmExit: jest.fn(),
    };

    it('should show chat content on desktop (not hidden behind tabs)', () => {
      render(<PlayerWaitingView {...defaultPlayerProps} />);

      // On desktop, the RoomChat component should be rendered and visible
      // without requiring the mobile tab bar
      const desktopChatArea = screen.queryByTestId('desktop-chat-area');

      // This test will FAIL because chat is currently only accessible
      // via the mobile tab bar which is hidden on desktop (lg:hidden)
      expect(desktopChatArea).toBeInTheDocument();
    });

    it('should show both players list and chat simultaneously on desktop', () => {
      render(<PlayerWaitingView {...defaultPlayerProps} />);

      // On desktop, both players list and chat should be visible at the same time
      // They should be rendered side-by-side, not behind tabs
      const playersSection = screen.queryByTestId('desktop-players-section');
      const chatSection = screen.queryByTestId('desktop-chat-area');

      // Both should be present in the DOM for desktop layout
      expect(playersSection).toBeInTheDocument();
      expect(chatSection).toBeInTheDocument();
    });
  });
});
