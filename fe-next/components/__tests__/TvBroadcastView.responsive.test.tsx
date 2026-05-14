import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TvBroadcastView from '@/host/components/TvBroadcastView';
import type { Language, LetterGrid } from '@/shared/types/game';
import type { Socket } from 'socket.io-client';
import { useTvFullscreen } from '@/host/hooks/useTvFullscreen';
import { useTvPlayerCombos } from '@/host/hooks/useTvPlayerCombos';
import { useTvNotifications } from '@/host/hooks/useTvNotifications';
import { useTvSounds } from '@/host/hooks/useTvSounds';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
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
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  return {
    ...actual,
    Maximize: () => <div data-testid="maximize-icon">Maximize</div>,
    Minimize: () => <div data-testid="minimize-icon">Minimize</div>,
    HelpCircle: () => <div data-testid="help-icon">?</div>,
  };
});

// Mock the hooks
vi.mock('@/host/hooks/useTvPlayerCombos');
vi.mock('@/host/hooks/useTvNotifications');
vi.mock('@/host/hooks/useTvSounds');
vi.mock('@/host/hooks/useTvFullscreen');
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

// Mock game state store
vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => 'classic',
  useHostSelectedGameMode: () => 'random',
  useWordHuntPlayerLives: () => ({}),
  useWordHuntEliminatedPlayers: () => [],
  useWordHuntTargetLength: () => 0,
}));

// Mock child components
vi.mock('@/host/components/tv-broadcast/TvTutorialOverlay', () => ({
  __esModule: true,
  default: () => null,
  isTvTutorialComplete: () => true,
  TvHelpButton: () => <button data-testid="tv-help-button">Help</button>,
}));

vi.mock('@/host/components/tv-broadcast/TvJoinBar', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-join-bar">Join Bar</div>,
}));

vi.mock('@/host/components/tv-broadcast/TvGameHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-game-header">Game Header with Timer</div>,
}));

vi.mock('@/host/components/tv-broadcast/TvActivityPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-activity-panel">Activity Panel</div>,
}));

vi.mock('@/host/components/tv-broadcast/TvMomentumTicker', () => ({
  __esModule: true,
  default: () => <div data-testid="momentum-ticker">Ticker</div>,
}));

vi.mock('@/host/components/tv-broadcast/TvLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-leaderboard">Leaderboard</div>,
}));

vi.mock('@/host/components/tv-broadcast/TvNotificationQueue', () => ({
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





  (useTvFullscreen as jest.Mock).mockReturnValue({
    isFullscreen: false,
    toggleFullscreen: vi.fn(),
    enterFullscreen: vi.fn(),
    exitFullscreen: vi.fn(),
    isSupported: true,
  });

  (useTvPlayerCombos as jest.Mock).mockReturnValue({
    playerCombos: {},
  });

  (useTvNotifications as jest.Mock).mockReturnValue({
    notifications: [],
    dismissNotification: vi.fn(),
  });

  (useTvSounds as jest.Mock).mockReturnValue({
    playSound: vi.fn(),
  });
});

describe('TvBroadcastView - Responsive Layout', () => {
  it('should render main content area with proper grid layout', () => {
    const { container } = render(<TvBroadcastView {...defaultProps} />);

    // Find the main content container (Activity Panel + Leaderboard) - uses CSS Grid
    const mainContent = container.querySelector('.flex-1.min-h-0.grid');
    expect(mainContent).toBeInTheDocument();
    expect(mainContent).toHaveClass('flex-1', 'min-h-0', 'grid');
  });

  it('should have activity panel rendered', () => {
    render(<TvBroadcastView {...defaultProps} />);

    const activityPanel = screen.getByTestId('tv-activity-panel');
    expect(activityPanel).toBeInTheDocument();
  });

  it('should constrain content within parent container', () => {
    const { container } = render(<TvBroadcastView {...defaultProps} />);

    // Root uses flex-1 to fill parent flex container
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('flex', 'flex-col');
    expect(root).toHaveClass('flex-1');
    expect(root).toHaveClass('min-h-0');

    // Join bar and game header should be present
    const joinBar = screen.getByTestId('tv-join-bar');
    const gameHeader = screen.getByTestId('tv-game-header');
    expect(joinBar).toBeInTheDocument();
    expect(gameHeader).toBeInTheDocument();
  });

  it('should render momentum ticker', () => {
    render(<TvBroadcastView {...defaultProps} />);
    expect(screen.getByTestId('momentum-ticker')).toBeInTheDocument();
  });
});

describe('TvBroadcastView - Fullscreen Behavior', () => {
  it('should keep join bar visible even in fullscreen mode', () => {

    (useTvFullscreen as jest.Mock).mockReturnValue({
      isFullscreen: true,
      toggleFullscreen: vi.fn(),
      enterFullscreen: vi.fn(),
      exitFullscreen: vi.fn(),
      isSupported: true,
    });

    render(<TvBroadcastView {...defaultProps} />);

    expect(screen.getByTestId('tv-join-bar')).toBeInTheDocument();
  });

  it('should keep timer visible in fullscreen mode', () => {

    (useTvFullscreen as jest.Mock).mockReturnValue({
      isFullscreen: true,
      toggleFullscreen: vi.fn(),
      enterFullscreen: vi.fn(),
      exitFullscreen: vi.fn(),
      isSupported: true,
    });

    render(<TvBroadcastView {...defaultProps} />);

    expect(screen.getByTestId('tv-game-header')).toBeInTheDocument();
  });

  it('should show game header with timer in non-fullscreen mode', () => {

    (useTvFullscreen as jest.Mock).mockReturnValue({
      isFullscreen: false,
      toggleFullscreen: vi.fn(),
      enterFullscreen: vi.fn(),
      exitFullscreen: vi.fn(),
      isSupported: true,
    });

    render(<TvBroadcastView {...defaultProps} />);

    expect(screen.getByTestId('tv-game-header')).toBeInTheDocument();
    expect(screen.getByTestId('tv-join-bar')).toBeInTheDocument();
  });

  it('should toggle fullscreen when button is clicked', () => {
    const toggleFullscreen = vi.fn();

    (useTvFullscreen as jest.Mock).mockReturnValue({
      isFullscreen: false,
      toggleFullscreen,
      enterFullscreen: vi.fn(),
      exitFullscreen: vi.fn(),
      isSupported: true,
    });

    render(<TvBroadcastView {...defaultProps} />);

    const fullscreenButton = screen.getByRole('button', { name: /fullscreen/i });
    fireEvent.click(fullscreenButton);

    expect(toggleFullscreen).toHaveBeenCalledTimes(1);
  });
});
