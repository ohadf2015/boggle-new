import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TvBroadcastView from '@/host/components/TvBroadcastView';
import type { Language, LetterGrid } from '@/shared/types/game';
import type { Socket } from 'socket.io-client';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, ...domProps } = props as Record<string, unknown>;
      return <div {...domProps}>{children}</div>;
    },
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, ...domProps } = props as Record<string, unknown>;
      return <button {...domProps}>{children}</button>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Maximize: () => <div data-testid="maximize-icon">Maximize</div>,
  Minimize: () => <div data-testid="minimize-icon">Minimize</div>,
  HelpCircle: () => <div data-testid="help-icon">?</div>,
}));

// Mock the hooks
jest.mock('@/host/hooks/useTvPlayerCombos');
jest.mock('@/host/hooks/useTvNotifications');
jest.mock('@/host/hooks/useTvSounds');
jest.mock('@/host/hooks/useTvFullscreen');

// Mock child components
jest.mock('@/host/components/tv-broadcast/TvTutorialOverlay', () => ({
  __esModule: true,
  default: () => null,
  isTvTutorialComplete: () => true,
  TvHelpButton: () => <button data-testid="tv-help-button">Help</button>,
}));

jest.mock('@/host/components/tv-broadcast/TvJoinBar', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-join-bar">Join Bar</div>,
}));

jest.mock('@/host/components/tv-broadcast/TvGameHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-game-header">Game Header with Timer</div>,
}));

jest.mock('@/host/components/tv-broadcast/TvGrid', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-grid">Grid</div>,
}));

jest.mock('@/host/components/tv-broadcast/TvLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-leaderboard">Leaderboard</div>,
}));

jest.mock('@/host/components/tv-broadcast/TvNotificationQueue', () => ({
  __esModule: true,
  default: () => null,
}));

const mockT = (key: string) => key;

const mockGrid: LetterGrid = [
  ['A', 'B'],
  ['C', 'D'],
];

const defaultProps = {
  gameCode: 'TEST123',
  username: 'host1',
  roomLanguage: 'en' as Language,
  roomName: 'Test Room',
  t: mockT,
  tableData: mockGrid,
  remainingTime: 120,
  timerValue: 2,
  playersReady: ['player1', 'player2'],
  playerScores: { player1: 100, player2: 50 },
  playerWordCounts: { player1: 5, player2: 3 },
  socket: null as Socket | null,
};

// Setup default mock implementations
beforeEach(() => {
  const { useTvFullscreen } = require('@/host/hooks/useTvFullscreen');
  const { useTvPlayerCombos } = require('@/host/hooks/useTvPlayerCombos');
  const { useTvNotifications } = require('@/host/hooks/useTvNotifications');
  const { useTvSounds } = require('@/host/hooks/useTvSounds');

  (useTvFullscreen as jest.Mock).mockReturnValue({
    isFullscreen: false,
    toggleFullscreen: jest.fn(),
    enterFullscreen: jest.fn(),
    exitFullscreen: jest.fn(),
    isSupported: true,
  });

  (useTvPlayerCombos as jest.Mock).mockReturnValue({
    playerCombos: {},
  });

  (useTvNotifications as jest.Mock).mockReturnValue({
    notifications: [],
    dismissNotification: jest.fn(),
  });

  (useTvSounds as jest.Mock).mockReturnValue({
    playSound: jest.fn(),
  });
});

describe('TvBroadcastView - Responsive Layout', () => {
  it('should render main content area with proper grid layout', () => {
    const { container } = render(<TvBroadcastView {...defaultProps} />);

    // Find the main content container (Grid + Leaderboard) - uses CSS Grid now
    const mainContent = container.querySelector('.flex-1.min-h-0.grid');
    expect(mainContent).toBeInTheDocument();
    expect(mainContent).toHaveClass('flex-1', 'min-h-0', 'grid');
  });

  it('should have grid and leaderboard with proper overflow handling', () => {
    render(<TvBroadcastView {...defaultProps} />);

    const grid = screen.getByTestId('tv-grid').parentElement;
    const leaderboard = screen.getByTestId('tv-leaderboard').parentElement;

    // Grid uses min-h-[180px] for mobile, leaderboard uses min-h-[120px]
    // On desktop (md:), both use min-h-0 to fill CSS Grid cells
    expect(grid).toHaveClass('min-h-[180px]');
    expect(leaderboard).toHaveClass('min-h-[120px]');

    // Grid uses overflow-hidden, leaderboard uses overflow-auto for scrolling
    expect(grid).toHaveClass('overflow-hidden');
    expect(leaderboard).toHaveClass('overflow-auto');
  });

  it('should constrain content within parent container', () => {
    const { container } = render(<TvBroadcastView {...defaultProps} />);

    // Root uses flex-1 to fill parent flex container (better than h-full)
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('flex', 'flex-col');
    expect(root).toHaveClass('flex-1');
    expect(root).toHaveClass('min-h-0'); // Prevents overflow in flex containers

    // Join bar and game header should NOT have fixed heights that overflow
    const joinBar = screen.getByTestId('tv-join-bar');
    const gameHeader = screen.getByTestId('tv-game-header');
    expect(joinBar).toBeInTheDocument();
    expect(gameHeader).toBeInTheDocument();
  });
});

describe('TvBroadcastView - Fullscreen Behavior', () => {
  it('should keep join bar visible even in fullscreen mode', () => {
    const { useTvFullscreen } = require('@/host/hooks/useTvFullscreen');
    (useTvFullscreen as jest.Mock).mockReturnValue({
      isFullscreen: true,
      toggleFullscreen: jest.fn(),
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn(),
      isSupported: true,
    });

    render(<TvBroadcastView {...defaultProps} />);

    // Join bar is now always visible (changed in refactor for better UX)
    expect(screen.getByTestId('tv-join-bar')).toBeInTheDocument();
  });

  it('should keep timer visible in fullscreen mode', () => {
    const { useTvFullscreen } = require('@/host/hooks/useTvFullscreen');
    (useTvFullscreen as jest.Mock).mockReturnValue({
      isFullscreen: true,
      toggleFullscreen: jest.fn(),
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn(),
      isSupported: true,
    });

    render(<TvBroadcastView {...defaultProps} />);

    // Game header with timer should STILL be visible in fullscreen
    // (only join bar is hidden, not the timer)
    expect(screen.getByTestId('tv-game-header')).toBeInTheDocument();
  });

  it('should show game header with timer in non-fullscreen mode', () => {
    const { useTvFullscreen } = require('@/host/hooks/useTvFullscreen');
    (useTvFullscreen as jest.Mock).mockReturnValue({
      isFullscreen: false,
      toggleFullscreen: jest.fn(),
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn(),
      isSupported: true,
    });

    render(<TvBroadcastView {...defaultProps} />);

    // Game header should be visible
    expect(screen.getByTestId('tv-game-header')).toBeInTheDocument();
    // Join bar should also be visible
    expect(screen.getByTestId('tv-join-bar')).toBeInTheDocument();
  });

  it('should toggle fullscreen when button is clicked', () => {
    const toggleFullscreen = jest.fn();
    const { useTvFullscreen } = require('@/host/hooks/useTvFullscreen');
    (useTvFullscreen as jest.Mock).mockReturnValue({
      isFullscreen: false,
      toggleFullscreen,
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn(),
      isSupported: true,
    });

    render(<TvBroadcastView {...defaultProps} />);

    // Find and click fullscreen button (Maximize icon)
    const fullscreenButton = screen.getByRole('button', { name: /fullscreen/i });
    fireEvent.click(fullscreenButton);

    expect(toggleFullscreen).toHaveBeenCalledTimes(1);
  });
});
