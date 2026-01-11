import React from 'react';
import { render } from '@testing-library/react';
import TvBroadcastView from '@/host/components/TvBroadcastView';
import type { Socket } from 'socket.io-client';

// Mock framer-motion to avoid matchMedia issues
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
}));

// Mock the subcomponents
jest.mock('@/host/components/tv-broadcast/TvJoinBar', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-join-bar">TvJoinBar</div>,
}));

jest.mock('@/host/components/tv-broadcast/TvGameHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-game-header">TvGameHeader</div>,
}));

jest.mock('@/host/components/tv-broadcast/TvGrid', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-grid">TvGrid</div>,
}));

jest.mock('@/host/components/tv-broadcast/TvLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-leaderboard">TvLeaderboard</div>,
}));

jest.mock('@/host/components/tv-broadcast/TvNotificationQueue', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-notification-queue">TvNotificationQueue</div>,
}));

// Mock hooks using jest.fn() pattern in factory
jest.mock('@/host/hooks/useTvFullscreen');
jest.mock('@/host/hooks/useTvPlayerCombos');
jest.mock('@/host/hooks/useTvSounds');
jest.mock('@/host/hooks/useTvNotifications');

describe('TvBroadcastView Layout Issues', () => {
  const mockProps = {
    gameCode: 'TEST123',
    username: 'TestHost',
    roomLanguage: 'en' as const,
    roomName: 'Test Room',
    t: (key: string) => key,
    tableData: [
      ['A', 'B', 'C', 'D'],
      ['E', 'F', 'G', 'H'],
      ['I', 'J', 'K', 'L'],
      ['M', 'N', 'O', 'P'],
    ],
    remainingTime: 180,
    timerValue: 3,
    playersReady: [
      { username: 'Player1', avatar: null, isHost: false },
      { username: 'Player2', avatar: null, isHost: false },
    ],
    playerScores: { Player1: 100, Player2: 75 },
    playerWordCounts: { Player1: 10, Player2: 8 },
    socket: null as Socket | null,
  };

  beforeEach(() => {
    // Setup default mock implementations
    const { useTvFullscreen } = require('@/host/hooks/useTvFullscreen');
    const { useTvPlayerCombos } = require('@/host/hooks/useTvPlayerCombos');
    const { useTvSounds } = require('@/host/hooks/useTvSounds');
    const { useTvNotifications } = require('@/host/hooks/useTvNotifications');

    useTvFullscreen.mockReturnValue({
      isFullscreen: false,
      toggleFullscreen: jest.fn(),
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn(),
      isSupported: true,
    });

    useTvPlayerCombos.mockReturnValue({
      playerCombos: {},
    });

    useTvSounds.mockReturnValue({
      playSound: jest.fn(),
    });

    useTvNotifications.mockReturnValue({
      notifications: [],
      dismissNotification: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not overflow screen when NOT in fullscreen mode', () => {
    const { container } = render(<TvBroadcastView {...mockProps} />);

    const rootDiv = container.firstChild as HTMLElement;

    // Check root has proper height constraint
    expect(rootDiv).toHaveClass('h-screen');
    expect(rootDiv).toHaveClass('overflow-hidden');

    // Main content should use flex-1 and min-h-0 to prevent overflow
    const mainContent = container.querySelector('.flex-1.min-h-0');
    expect(mainContent).toBeInTheDocument();

    // Check responsive padding (smaller on mobile, larger on desktop)
    expect(mainContent).toHaveClass('p-2');
    expect(mainContent).toHaveClass('md:p-4');

    // Check responsive gap (smaller on mobile, larger on desktop)
    expect(mainContent).toHaveClass('gap-2');
    expect(mainContent).toHaveClass('md:gap-4');

    // Check that flex layout is properly configured (check classes, not computed styles in JSDOM)
    expect(rootDiv).toHaveClass('flex');
    expect(rootDiv).toHaveClass('flex-col');
  });

  it('should properly handle fullscreen layout with hidden headers', () => {
    const { useTvFullscreen } = require('@/host/hooks/useTvFullscreen');
    useTvFullscreen.mockReturnValueOnce({
      isFullscreen: true,
      toggleFullscreen: jest.fn(),
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn(),
      isSupported: true,
    });

    const { container } = render(<TvBroadcastView {...mockProps} />);

    // In fullscreen, header and join bar should not be rendered (AnimatePresence exit)
    // This test verifies the layout still works when these elements are hidden
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).toHaveClass('h-screen');

    // The main content area should expand to fill available space
    const mainContent = container.querySelector('.flex-1.min-h-0');
    expect(mainContent).toBeInTheDocument();
  });

  it('should maintain proper aspect ratio for grid cells', () => {
    const { container } = render(<TvBroadcastView {...mockProps} />);

    // Grid container should have proper constraints
    // The issue: grid overflows when not calculated correctly
    const gridContainer = container.querySelector('.flex-1.min-h-0.flex.items-center.justify-center');
    expect(gridContainer).toBeInTheDocument();

    // Should have overflow-hidden to prevent content from spilling
    expect(gridContainer).toHaveClass('overflow-hidden');
  });
});
