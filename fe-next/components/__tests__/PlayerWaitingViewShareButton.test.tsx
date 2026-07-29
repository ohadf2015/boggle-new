// @vitest-environment jsdom
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
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
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
    li: ({ children, className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li className={className} {...props}>{children}</li>
    ),
  };
  return {
    m: motionObj,
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
  useAuth: () => ({ isAuthenticated: false, updateProfile: vi.fn() }),
}));

// Mock SocketContext
vi.mock('../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }),
  useSocketOptional: () => ({ socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }),
}));

// Mock gameState hooks
vi.mock('@/hooks/gameState', () => ({
  useGameMode: () => 'classic',
  useHostSelectedGameMode: () => 'random',
}));

// Mock RewardedAdGoldButton
vi.mock('@/components/ads/RewardedAdGoldButton', () => ({
  __esModule: true,
  default: () => <div data-testid="rewarded-ad" />,
}));

// Mock animation presets
vi.mock('@/lib/animation/presets', () => ({
  SPRING_PRESETS: { balanced: { type: 'spring', stiffness: 300, damping: 26 } },
}));

// Mock profileStorage
vi.mock('@/utils/profileStorage', () => ({
  getOrCreateStoredCustomAvatar: () => null,
  setStoredCustomAvatar: vi.fn(),
}));

// Mock useAvatarPremium
vi.mock('@/hooks/useAvatarPremium', () => ({
  useAvatarPremium: () => ({ isPremium: false }),
}));

// Mock AvatarBuilderModal
vi.mock('@/components/avatar/AvatarBuilderModal', () => ({
  __esModule: true,
  default: () => null,
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
      // Player count appears in header badge and roster header
      const counts = screen.getAllByText('2/8');
      expect(counts.length).toBeGreaterThanOrEqual(1);
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
      // MobileShareSection renders in both header (compact) and mobile content
      const sections = screen.getAllByTestId('mobile-share-section');
      expect(sections.length).toBeGreaterThanOrEqual(1);
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
