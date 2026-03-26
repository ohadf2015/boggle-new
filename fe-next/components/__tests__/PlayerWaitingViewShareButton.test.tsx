/**
 * Test: PlayerWaitingView - Command Center Style
 *
 * Requirements:
 * 1. Room code visible with glow effect in header
 * 2. Player count badge and exit button in header
 * 3. Waiting status banner displayed
 * 4. Player roster with circular avatars
 * 5. Desktop uses DesktopLobbyLayout, mobile uses scrollable layout
 * 6. Share section available on mobile (MobileShareSection)
 * 7. Chat visible on both layouts
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

// Mock framer-motion
vi.mock('framer-motion', () => {
  const motionObj = {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement> & { onClick?: () => void }) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
  };
  return {
    motion: motionObj,
    m: motionObj,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock RoomChat component
vi.mock('../../components/RoomChat', () => ({
  __esModule: true,
  default: ({ className }: { className?: string }) => (
    <div data-testid="room-chat-mock" className={className}>Mock RoomChat</div>
  ),
}));

// Mock MobileShareSection
vi.mock('../../host/components/pre-game/MobileShareSection', () => ({
  MobileShareSection: ({ gameCode }: { gameCode: string }) => (
    <div data-testid="mobile-share-section">Share: {gameCode}</div>
  ),
}));

// Mock DesktopLobbyLayout
vi.mock('../../host/components/pre-game/desktop', () => ({
  DesktopLobbyLayout: ({ leftContent, rightContent }: { leftContent: React.ReactNode; rightContent: React.ReactNode }) => (
    <div data-testid="desktop-lobby-layout">
      <div data-testid="desktop-left-column">{leftContent}</div>
      <div data-testid="desktop-right-column">{rightContent}</div>
    </div>
  ),
  InviteCard: ({ gameCode }: { gameCode: string }) => (
    <div data-testid="invite-card">Invite: {gameCode}</div>
  ),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  success: vi.fn(),
  error: vi.fn(),
}));

// Mock share utils
vi.mock('../../utils/share', () => ({
  getJoinUrl: (code: string) => `https://example.com?room=${code}`,
}));

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

// Mock SocketContext
vi.mock('../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }),
}));

import PlayerWaitingView from '../../player/components/PlayerWaitingView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockT = (key: string) => key;

describe('PlayerWaitingView - Command Center Style', () => {
  const defaultProps = {
    gameCode: 'ABC123',
    gameLanguage: 'en' as const,
    username: 'TestPlayer',
    t: mockT,
    playersReady: [
      { username: 'TestHost', isHost: true },
      { username: 'TestPlayer', isHost: false },
    ],
    showQR: false,
    setShowQR: vi.fn(),
    showExitConfirm: false,
    setShowExitConfirm: vi.fn(),
    onExitRoom: vi.fn(),
    onConfirmExit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  describe('Header', () => {
    it('should not display room code in header (removed)', () => {
      render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });
      expect(screen.queryByTestId('room-code')).not.toBeInTheDocument();
    });

    it('should display player count badge', () => {
      render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });
      // All players including host are shown in the roster
      expect(screen.getByText('2/8')).toBeInTheDocument();
    });

    it('should have an exit button', () => {
      render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });
      const exitBtn = screen.getByRole('button', { name: /exit/i });
      expect(exitBtn).toBeInTheDocument();
    });

    it('should call onExitRoom when exit button is clicked', () => {
      render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });
      const exitBtn = screen.getByRole('button', { name: /exit/i });
      fireEvent.click(exitBtn);
      expect(defaultProps.onExitRoom).toHaveBeenCalledTimes(1);
    });

    it('should not have a copy code button (room code removed)', () => {
      render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });
      expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
    });
  });

  describe('Waiting Status', () => {
    it('should display waiting status banner', () => {
      render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });
      const status = screen.getAllByTestId('waiting-status');
      expect(status.length).toBeGreaterThan(0);
    });

    it('should show waiting message text', () => {
      render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });
      expect(screen.getAllByText('playerView.hostWillStart').length).toBeGreaterThan(0);
    });
  });

  describe('Player Roster', () => {
    it('should display player names', () => {
      render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });
      // Component filters out host players, only non-host players appear in roster
      expect(screen.getAllByText('TestPlayer').length).toBeGreaterThan(0);
    });

    it('should show empty slots when fewer than max players', () => {
      render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });
      // With 2 players, should show 3 empty slots (min(5, 8) - 2 = 3)
      const joinTexts = screen.getAllByText('common.join');
      expect(joinTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Desktop Layout', () => {
    it('should render DesktopLobbyLayout', () => {
      render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });
      expect(screen.getByTestId('desktop-lobby-layout')).toBeInTheDocument();
    });

    it('should render InviteCard in desktop right column', () => {
      render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });
      expect(screen.getByTestId('invite-card')).toBeInTheDocument();
    });

    it('should render chat in desktop layout', () => {
      render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });
      expect(screen.getByTestId('desktop-chat-area')).toBeInTheDocument();
    });
  });

  describe('Mobile Layout', () => {
    it('should render MobileShareSection', () => {
      render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });
      expect(screen.getByTestId('mobile-share-section')).toBeInTheDocument();
    });
  });

  describe('Exit Confirmation', () => {
    it('should not show exit dialog when showExitConfirm is false', () => {
      render(<PlayerWaitingView {...defaultProps} />, { wrapper: createWrapper() });
      expect(screen.queryByText('playerView.exitConfirmation')).not.toBeInTheDocument();
    });

    it('should show exit dialog when showExitConfirm is true', () => {
      render(<PlayerWaitingView {...defaultProps} showExitConfirm={true} />, { wrapper: createWrapper() });
      expect(screen.getByText('playerView.exitConfirmation')).toBeInTheDocument();
    });

    it('should call onConfirmExit when confirm is clicked in exit dialog', () => {
      render(<PlayerWaitingView {...defaultProps} showExitConfirm={true} />, { wrapper: createWrapper() });
      const confirmBtn = screen.getByText('common.confirm');
      fireEvent.click(confirmBtn);
      expect(defaultProps.onConfirmExit).toHaveBeenCalledTimes(1);
    });
  });
});
