/**
 * Test: Multiplayer Lobby Mobile/Desktop Layout Split
 *
 * The lobby was redesigned from tab-based navigation to:
 * - Mobile: single-scroll vertical flow (lg:hidden)
 * - Desktop: two-column DesktopLobbyLayout (hidden lg:block)
 *
 * Requirements:
 * 1. Mobile layout is hidden on desktop (lg:hidden)
 * 2. Desktop layout is hidden on mobile (hidden lg:block)
 * 3. Both HostPreGameView and PlayerWaitingView follow this pattern
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

// Mock framer-motion
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

// Mock TvTutorialOverlay component
jest.mock('../../host/components/tv-broadcast/TvTutorialOverlay', () => ({
  __esModule: true,
  default: () => null,
  isTvTutorialComplete: () => true,
}));

import HostPreGameView from '../../host/components/HostPreGameView';
import PlayerWaitingView from '../../player/components/PlayerWaitingView';

const mockT = (key: string) => key;

describe('Multiplayer Lobby Mobile/Desktop Layout Split', () => {
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

    it('should have mobile layout hidden on desktop (lg screens)', () => {
      render(<HostPreGameView {...defaultHostProps} />);

      // The mobile single-scroll container has lg:hidden class
      const desktopLayout = screen.getByTestId('desktop-lobby-layout');
      const mobileContainer = desktopLayout.parentElement?.nextElementSibling;

      // Mobile container uses lg:hidden
      expect(mobileContainer?.className).toContain('lg:hidden');
    });

    it('should have start button in both desktop and mobile layouts', () => {
      render(<HostPreGameView {...defaultHostProps} />);

      // StartButton renders t('hostView.startBattle') which returns 'hostView.startBattle' via mockT
      const startButtons = screen.getAllByRole('button', { name: /startBattle/i });

      // Two start buttons: one in desktop layout, one in mobile layout
      expect(startButtons.length).toBe(2);

      // Find the desktop start button (inside hidden lg:block container)
      const desktopStartButton = startButtons.find((btn) => {
        let parent = btn.parentElement;
        while (parent) {
          if (parent.className?.includes('lg:block')) {
            return true;
          }
          parent = parent.parentElement;
        }
        return false;
      });

      expect(desktopStartButton).toBeTruthy();
    });

    it('should have desktop layout with two-column grid', () => {
      render(<HostPreGameView {...defaultHostProps} />);

      const desktopLayout = screen.getByTestId('desktop-lobby-layout');

      // DesktopLobbyLayout uses a 12-column grid
      expect(desktopLayout.className).toContain('grid-cols-12');

      // Left column (7/12) and right column (5/12)
      const leftColumn = screen.getByTestId('desktop-left-column');
      const rightColumn = screen.getByTestId('desktop-right-column');
      expect(leftColumn.className).toContain('col-span-7');
      expect(rightColumn.className).toContain('col-span-5');
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

    it('should have mobile layout hidden on desktop (lg screens)', () => {
      render(<PlayerWaitingView {...defaultPlayerProps} />);

      // The mobile single-scroll container has lg:hidden class
      const desktopLayout = screen.getByTestId('desktop-lobby-layout');
      const mobileContainer = desktopLayout.parentElement?.nextElementSibling;

      // Mobile container uses lg:hidden
      expect(mobileContainer?.className).toContain('lg:hidden');
    });

    it('should have desktop two-column layout with chat', () => {
      render(<PlayerWaitingView {...defaultPlayerProps} />);

      // Desktop layout renders chat area
      const chatArea = screen.queryByTestId('desktop-chat-area');
      expect(chatArea).toBeInTheDocument();

      // Desktop layout uses grid columns
      const desktopLayout = screen.getByTestId('desktop-lobby-layout');
      expect(desktopLayout.className).toContain('grid-cols-12');
    });
  });
});
