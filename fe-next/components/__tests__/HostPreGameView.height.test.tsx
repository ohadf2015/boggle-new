/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HostPreGameView from '../../host/components/HostPreGameView';
import { SocketContext } from '../../utils/SocketContext';

// Mock next/navigation
vi.mock('@/components/lobby/LobbyRewardCluster', () => ({ LobbyRewardCluster: () => null }));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock CrazyGames invite hook
vi.mock('../../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    showInviteButton: vi.fn(),
    hideInviteButton: vi.fn(),
    isInviteButtonVisible: false,
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
  const motion = {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <span {...props}>{children}</span>,
  };
  return {
    motion,
    m: motion,
    LazyMotion: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    domAnimation: {},
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

// Mock RoomChat component since it requires LanguageProvider
vi.mock('../../components/RoomChat', () => ({
  __esModule: true,
  default: ({ className }: { className?: string }) => (
    <div data-testid="room-chat-mock" className={className}>Mock RoomChat</div>
  ),
}));

// Mock BotControls component since it requires LanguageProvider
vi.mock('../../components/BotControls', () => ({
  __esModule: true,
  default: () => <div data-testid="bot-controls-mock">Mock BotControls</div>,
}));

// Mock TvTutorialOverlay to avoid UI library dependency issues in tests
vi.mock('../../host/components/tv-broadcast/TvTutorialOverlay', () => ({
  __esModule: true,
  default: () => null,
  isTvTutorialComplete: () => true,
  TvHelpButton: () => null,
}));

const mockT = (key: string) => key;

const defaultProps = {
  gameCode: 'TEST123',
  roomLanguage: 'en' as const,
  language: 'en' as const,
  username: 'TestHost',
  t: mockT,
  timerValue: 2,
  setTimerValue: vi.fn(),
  timerDirection: 0,
  setTimerDirection: vi.fn(),
  difficulty: 'MEDIUM' as const,
  setDifficulty: vi.fn(),
  minWordLength: 2,
  setMinWordLength: vi.fn(),
  gameType: 'regular' as const,
  setGameType: vi.fn(),
  tournamentRounds: 3,
  setTournamentRounds: vi.fn(),
  tournamentData: null,
  hostPlaying: true,
  setHostPlaying: vi.fn(),
  playersReady: [],
  playerWordCounts: {},
  shufflingGrid: null,
  highlightedCells: [],
  tableData: [['A', 'B'], ['C', 'D']],
  onStartGame: vi.fn(),
  onExitRoom: vi.fn(),
  onCancelTournament: vi.fn(),
  tournamentCreating: false,
};

const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connected: true,
  id: 'test-socket-id',
};

const socketContextValue = {
  socket: mockSocket as any,
  isConnected: true,
  connectionError: null,
  isReconnecting: false,
  getReconnectAttempt: () => 0,
  maxReconnectAttempts: 5,
  manualReconnect: vi.fn(),
};

describe('HostPreGameView Height Constraint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use flex-1 instead of h-dvh to fit within parent container', () => {
    const { container } = render(
      <SocketContext.Provider value={socketContextValue}>
        <HostPreGameView {...defaultProps} />
      </SocketContext.Provider>
    );

    // Get the root div of HostPreGameView
    const rootDiv = container.firstChild as HTMLElement;

    // The root div should have flex-1 class (fills available space in flex context), NOT h-dvh
    // This ensures the component fills its parent container without exceeding it
    expect(rootDiv.className).toContain('flex-1');
    expect(rootDiv.className).not.toContain('h-dvh');
  });

  it('should have proper flex layout structure for content containment', () => {
    const { container } = render(
      <SocketContext.Provider value={socketContextValue}>
        <HostPreGameView {...defaultProps} />
      </SocketContext.Provider>
    );

    const rootDiv = container.firstChild as HTMLElement;

    // Should have flex column layout
    expect(rootDiv.className).toContain('flex');
    expect(rootDiv.className).toContain('flex-col');

    // Note: overflow-hidden was intentionally removed from root container
    // (see bug fix c79cbc70ab2846c98f15bc7c2a00c2e9) - inner containers
    // handle overflow with overflow-y-auto instead
    expect(rootDiv.className).not.toContain('overflow-hidden');
  });
});
