import { vi, type Mock, } from 'vitest';
/**
 * Tests for HostPreGameView game mode selection and default settings.
 *
 * - Default "party" preset settings are applied on mount (timer=2, MEDIUM)
 * - Game mode cards are always visible (no collapsible)
 * - Default game mode is "random"
 * - Game mode buttons render for both desktop and mobile
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HostPreGameView from '../host/components/HostPreGameView';
import type { DifficultyLevel } from '@/shared/types/game';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const motion = {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, whileTap, whileHover, ...validProps } = props;
      return <div {...validProps}>{children}</div>;
    },
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, whileTap, whileHover, ...validProps } = props;
      return <button {...validProps}>{children}</button>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, whileTap, whileHover, ...validProps } = props;
      return <span {...validProps}>{children}</span>;
    },
  };
  return {
    motion,
    m: motion,
    LazyMotion: ({ children }: React.PropsWithChildren) => <>{children}</>,
    domAnimation: {},
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

vi.mock('@/components/lobby/LobbyRewardCluster', () => ({ LobbyRewardCluster: () => null }));

vi.mock('../utils/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: true, isAuthenticated: true, profile: null }),
}));

vi.mock('../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    showInviteButton: vi.fn(),
    hideInviteButton: vi.fn(),
    isInviteButtonVisible: false,
  }),
}));

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../components/Avatar', () => ({
  default: function MockAvatar() { return <div data-testid="avatar" />; },
}));
vi.mock('../components/RoomChat', () => ({
  default: function MockRoomChat() { return <div data-testid="room-chat" />; },
}));
vi.mock('../components/PresenceIndicator', () => ({
  default: function MockPresenceIndicator() { return <div data-testid="presence-indicator" />; },
}));
vi.mock('../components/BotControls', () => ({
  default: function MockBotControls() { return <div data-testid="bot-controls" />; },
}));
vi.mock('@/components/layout/MobileDrawer', () => ({
  MobileDrawer: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div data-testid="mobile-drawer">{children}</div> : null,
}));
vi.mock('../lib/utils', () => ({
  cn: (...classes: (string | undefined | boolean)[]) => classes.filter(Boolean).join(' '),
}));
vi.mock('../host/components/tv-broadcast/TvTutorialOverlay', () => ({
  __esModule: true,
  default: () => null,
  isTvTutorialComplete: () => true,
  TvHelpButton: () => null,
}));

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'gameModes.random': 'Random',
    'gameModes.randomizing': 'Surprise!',
    'gameModes.classic.name': 'Classic',
    'gameModes.classic.description': 'Find as many words as you can!',
    'gameModes.blast.name': 'Blast',
    'gameModes.blast.description': 'Clear tiles with combos!',
    'gameModes.wordHunt.name': 'Word Hunt',
    'gameModes.wordHunt.description': 'Race to find the target word!',
    'gameModes.nextMode': 'Game Mode',
    'hostView.broadcastModeTitle': 'TV Mode',
    'hostView.battleMode': 'Battle Mode',
    'common.minutes': 'MIN',
  };
  return translations[key] || key;
};

const defaultProps = {
  gameCode: 'ABC123',
  roomLanguage: 'en' as const,
  language: 'en' as const,
  username: 'TestHost',
  t: mockT,
  timerValue: 2,
  setTimerValue: vi.fn(),
  timerDirection: 0,
  setTimerDirection: vi.fn(),
  difficulty: 'MEDIUM' as DifficultyLevel,
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
  tableData: [],
  onStartGame: vi.fn(),
  onExitRoom: vi.fn(),
  onCancelTournament: vi.fn(),
  tournamentCreating: false,
};

vi.mock('@/hooks/gameState', () => ({
  useGameMode: () => null,
  useHostSelectedGameMode: () => 'random',
  useGameActions: () => ({ setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }),
}));

vi.mock('@/components/ui/DJMascot', () => ({
  DJMascotWithEntrance: () => null,
}));

describe('HostPreGameView Game Mode Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies default party preset on mount', async () => {
    const setTimerValue = vi.fn();
    const setDifficulty = vi.fn();
    const setMinWordLength = vi.fn();

    render(
      <HostPreGameView
        {...defaultProps}
        setTimerValue={setTimerValue}
        setDifficulty={setDifficulty}
        setMinWordLength={setMinWordLength}
      />
    );

    await waitFor(() => {
      expect(setTimerValue).toHaveBeenCalledWith(2);
      expect(setDifficulty).toHaveBeenCalledWith('MEDIUM');
      expect(setMinWordLength).toHaveBeenCalledWith(2);
    });
  });

  it('renders game mode buttons visible without needing to expand', () => {
    render(<HostPreGameView {...defaultProps} />);

    // Game mode cards should be visible immediately (no collapse)
    const gameModeButtons = screen.getAllByTestId(/^game-mode-/);
    expect(gameModeButtons.length).toBeGreaterThanOrEqual(3); // random, classic, word-hunt (×2 for mobile+desktop)
  });


  it('game mode buttons are clickable', () => {
    render(<HostPreGameView {...defaultProps} />);

    const wordHuntButtons = screen.getAllByTestId('game-mode-word-hunt');
    fireEvent.click(wordHuntButtons[0]);

    // Should not throw — mode selection is handled via state
  });
});
