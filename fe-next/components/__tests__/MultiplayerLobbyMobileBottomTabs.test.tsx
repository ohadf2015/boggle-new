/**
 * Test: Multiplayer Lobby Mobile Bottom Tabs
 *
 * Requirements:
 * 1. Bottom tabs should only show on mobile view (not desktop)
 * 2. Start button and tabs should stick to the bottom of the screen
 * 3. Both HostPreGameView and PlayerWaitingView should follow this pattern
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

import HostPreGameView from '../../host/components/HostPreGameView';
import PlayerWaitingView from '../../player/components/PlayerWaitingView';

const mockT = (key: string) => key;

describe('Multiplayer Lobby Mobile Bottom Tabs', () => {
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

    it('should have bottom tabs hidden on desktop (lg screens)', () => {
      render(<HostPreGameView {...defaultHostProps} />);

      // Find the bottom navigation (tab bar)
      const bottomNav = screen.getByRole('navigation');

      // Check that the nav has lg:hidden class to hide on desktop
      expect(bottomNav.className).toContain('lg:hidden');
    });

    it('should have start button section visible on mobile and sticky', () => {
      render(<HostPreGameView {...defaultHostProps} />);

      // Find all start buttons (now there are two: desktop and mobile)
      const startButtons = screen.getAllByRole('button', { name: /startGame/i });

      // Find the mobile start button (the one inside lg:hidden container)
      const mobileStartButton = startButtons.find((btn) => {
        let parent = btn.parentElement;
        while (parent) {
          if (parent.className?.includes('lg:hidden')) {
            return true;
          }
          parent = parent.parentElement;
        }
        return false;
      });

      expect(mobileStartButton).toBeTruthy();
      const mobileStartButtonContainer = mobileStartButton?.parentElement;

      // Check container has classes for sticky positioning
      expect(mobileStartButtonContainer).toHaveClass('flex-shrink-0');

      // The mobile start button container should have lg:hidden
      expect(mobileStartButtonContainer?.className).toContain('lg:hidden');
    });

    it('should have start button sticky at bottom with tabs', () => {
      render(<HostPreGameView {...defaultHostProps} />);

      // Find all start buttons and get the mobile one
      const startButtons = screen.getAllByRole('button', { name: /startGame/i });
      const mobileStartButton = startButtons.find((btn) => {
        let parent = btn.parentElement;
        while (parent) {
          if (parent.className?.includes('lg:hidden')) {
            return true;
          }
          parent = parent.parentElement;
        }
        return false;
      });

      const startButtonContainer = mobileStartButton?.parentElement;
      const nav = screen.getByRole('navigation');

      // Both should have flex-shrink-0 to prevent compression
      expect(startButtonContainer).toHaveClass('flex-shrink-0');
      expect(nav).toHaveClass('flex-shrink-0');
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

    it('should have bottom tabs hidden on desktop (lg screens)', () => {
      render(<PlayerWaitingView {...defaultPlayerProps} />);

      // Find the bottom navigation (tab bar)
      const bottomNav = screen.getByRole('navigation');

      // Check that the nav has lg:hidden class to hide on desktop
      expect(bottomNav.className).toContain('lg:hidden');
    });

    it('should have bottom tabs sticky at the bottom', () => {
      render(<PlayerWaitingView {...defaultPlayerProps} />);

      const nav = screen.getByRole('navigation');

      // Check that nav has flex-shrink-0 to prevent compression
      expect(nav).toHaveClass('flex-shrink-0');
    });
  });
});
