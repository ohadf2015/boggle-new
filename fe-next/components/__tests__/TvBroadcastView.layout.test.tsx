import React from 'react';
import { render } from '@testing-library/react';
import TvBroadcastView from '@/host/components/TvBroadcastView';
import type { Socket } from 'socket.io-client';

// Mock framer-motion to avoid matchMedia issues
vi.mock('framer-motion', () => ({
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
  useReducedMotion: () => false,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Maximize: () => <div data-testid="maximize-icon">Maximize</div>,
  Minimize: () => <div data-testid="minimize-icon">Minimize</div>,
  HelpCircle: () => <div data-testid="help-icon">?</div>,
}));

// Mock the subcomponents
vi.mock('@/host/components/tv-broadcast/TvJoinBar', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-join-bar">TvJoinBar</div>,
}));

vi.mock('@/host/components/tv-broadcast/TvGameHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-game-header">TvGameHeader</div>,
}));

vi.mock('@/host/components/tv-broadcast/TvActivityPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-activity-panel">TvActivityPanel</div>,
}));

vi.mock('@/host/components/tv-broadcast/TvMomentumTicker', () => ({
  __esModule: true,
  default: () => <div data-testid="momentum-ticker">Ticker</div>,
}));

vi.mock('@/host/components/tv-broadcast/TvLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-leaderboard">TvLeaderboard</div>,
}));

vi.mock('@/host/components/tv-broadcast/TvNotificationQueue', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-notification-queue">TvNotificationQueue</div>,
}));

vi.mock('@/host/components/tv-broadcast/TvTutorialOverlay', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-tutorial-overlay">TvTutorialOverlay</div>,
  isTvTutorialComplete: () => true,
  TvHelpButton: ({ onClick }: { onClick: () => void }) => (
    <button data-testid="tv-help-button" onClick={onClick}>Help</button>
  ),
}));

// Mock hooks
vi.mock('@/host/hooks/useTvFullscreen');
vi.mock('@/host/hooks/useTvPlayerCombos');
vi.mock('@/host/hooks/useTvSounds');
vi.mock('@/host/hooks/useTvNotifications');
vi.mock('@/host/hooks/useTvFinalMinute', () => ({
  useTvFinalMinute: () => ({
    isFinalMinute: false,
    isFinalStretch: false,
    isCritical: false,
    urgencyLevel: 'normal',
    heartbeatInterval: 0,
    bgTintClass: '',
  }),
}));

vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => 'classic',
}));

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
    const { useTvFullscreen } = require('@/host/hooks/useTvFullscreen');
    const { useTvPlayerCombos } = require('@/host/hooks/useTvPlayerCombos');
    const { useTvSounds } = require('@/host/hooks/useTvSounds');
    const { useTvNotifications } = require('@/host/hooks/useTvNotifications');

    useTvFullscreen.mockReturnValue({
      isFullscreen: false,
      toggleFullscreen: vi.fn(),
      enterFullscreen: vi.fn(),
      exitFullscreen: vi.fn(),
      isSupported: true,
    });

    useTvPlayerCombos.mockReturnValue({
      playerCombos: {},
    });

    useTvSounds.mockReturnValue({
      playSound: vi.fn(),
    });

    useTvNotifications.mockReturnValue({
      notifications: [],
      dismissNotification: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not overflow screen when NOT in fullscreen mode', () => {
    const { container } = render(<TvBroadcastView {...mockProps} />);

    const rootDiv = container.firstChild as HTMLElement;

    // Check root uses flex-1 to fill parent flex container
    expect(rootDiv).toHaveClass('flex-1');
    expect(rootDiv).toHaveClass('min-h-0');
    expect(rootDiv).toHaveClass('overflow-hidden');

    // Main content should use CSS Grid layout
    const mainContent = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-2');
    expect(mainContent).toBeInTheDocument();
    expect(mainContent).toHaveClass('flex-1');
    expect(mainContent).toHaveClass('min-h-0');

    // Check responsive padding
    expect(mainContent).toHaveClass('p-2');
    expect(mainContent).toHaveClass('md:p-4');

    // Check responsive gap
    expect(mainContent).toHaveClass('gap-2');
    expect(mainContent).toHaveClass('md:gap-4');
  });

  it('should properly handle fullscreen layout', () => {
    const { useTvFullscreen } = require('@/host/hooks/useTvFullscreen');
    useTvFullscreen.mockReturnValueOnce({
      isFullscreen: true,
      toggleFullscreen: vi.fn(),
      enterFullscreen: vi.fn(),
      exitFullscreen: vi.fn(),
      isSupported: true,
    });

    const { container } = render(<TvBroadcastView {...mockProps} />);

    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).toHaveClass('flex-1');
    expect(rootDiv).toHaveClass('min-h-0');

    const mainContent = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-2');
    expect(mainContent).toBeInTheDocument();
    expect(mainContent).toHaveClass('flex-1');
    expect(mainContent).toHaveClass('min-h-0');
  });

  it('should render activity panel and leaderboard in grid', () => {
    const { container } = render(<TvBroadcastView {...mockProps} />);

    // Activity panel container
    const activityContainer = container.querySelector('.min-h-\\[180px\\].md\\:min-h-0');
    expect(activityContainer).toBeInTheDocument();
    expect(activityContainer).toHaveClass('overflow-hidden');
  });
});
