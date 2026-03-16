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
jest.mock('framer-motion', () => ({
  motion: {
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
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('../utils/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
}));

jest.mock('../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    showInviteButton: jest.fn(),
    hideInviteButton: jest.fn(),
    isInviteButtonVisible: false,
  }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('../components/Avatar', () => {
  return function MockAvatar() { return <div data-testid="avatar" />; };
});
jest.mock('../components/RoomChat', () => {
  return function MockRoomChat() { return <div data-testid="room-chat" />; };
});
jest.mock('../components/PresenceIndicator', () => {
  return function MockPresenceIndicator() { return <div data-testid="presence-indicator" />; };
});
jest.mock('../components/BotControls', () => {
  return function MockBotControls() { return <div data-testid="bot-controls" />; };
});
jest.mock('@/components/layout/MobileDrawer', () => ({
  MobileDrawer: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div data-testid="mobile-drawer">{children}</div> : null,
}));
jest.mock('../lib/utils', () => ({
  cn: (...classes: (string | undefined | boolean)[]) => classes.filter(Boolean).join(' '),
}));
jest.mock('../host/components/tv-broadcast/TvTutorialOverlay', () => ({
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
  setTimerValue: jest.fn(),
  timerDirection: 0,
  setTimerDirection: jest.fn(),
  difficulty: 'MEDIUM' as DifficultyLevel,
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
  playersReady: [],
  playerWordCounts: {},
  shufflingGrid: null,
  highlightedCells: [],
  tableData: [],
  onStartGame: jest.fn(),
  onExitRoom: jest.fn(),
  onCancelTournament: jest.fn(),
  tournamentCreating: false,
};

jest.mock('@/hooks/gameState', () => ({
  useGameMode: () => null,
  useGameActions: () => ({ setGameMode: jest.fn() }),
}));

jest.mock('@/components/ui/DJMascot', () => ({
  DJMascotWithEntrance: () => null,
}));

describe('HostPreGameView Game Mode Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies default party preset on mount', async () => {
    const setTimerValue = jest.fn();
    const setDifficulty = jest.fn();
    const setMinWordLength = jest.fn();

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
    expect(gameModeButtons.length).toBeGreaterThanOrEqual(4); // random, classic, blast, word-hunt (×2 for mobile+desktop)
  });

  it('renders bot controls visible without needing to expand', () => {
    render(<HostPreGameView {...defaultProps} />);

    // Bot controls should be visible immediately
    const botControls = screen.getAllByTestId('bot-controls');
    expect(botControls.length).toBeGreaterThanOrEqual(1);
  });

  it('game mode buttons are clickable', () => {
    render(<HostPreGameView {...defaultProps} />);

    const blastButtons = screen.getAllByTestId('game-mode-blast');
    fireEvent.click(blastButtons[0]);

    // Should not throw — mode selection is handled via state
  });
});
