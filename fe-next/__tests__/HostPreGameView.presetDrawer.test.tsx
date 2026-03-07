/**
 * Tests for HostPreGameView preset selection functionality
 *
 * Tests that clicking preset buttons directly applies settings:
 * - Clicking preset applies timer, difficulty, and minWordLength
 * - Default preset (party) is applied on mount
 * - Each preset applies its correct settings
 * - Preset drawer component exists but is not currently wired to open
 *
 * Note: The PresetInfoDrawer component exists in the code but
 * presetInfoOpen is never set to a non-null value, so the drawer
 * never opens. All preset buttons directly apply settings via
 * handleApplyPreset.
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

// Mock socket context
jest.mock('../utils/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
}));

// Mock CrazyGames invite hook
jest.mock('../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    showInviteButton: jest.fn(),
    hideInviteButton: jest.fn(),
    isInviteButtonVisible: false,
  }),
}));

// Mock toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock child components
jest.mock('../components/Avatar', () => {
  return function MockAvatar() {
    return <div data-testid="avatar" />;
  };
});

jest.mock('../components/RoomChat', () => {
  return function MockRoomChat() {
    return <div data-testid="room-chat" />;
  };
});

jest.mock('../components/PresenceIndicator', () => {
  return function MockPresenceIndicator() {
    return <div data-testid="presence-indicator" />;
  };
});

jest.mock('../components/BotControls', () => {
  return function MockBotControls() {
    return <div data-testid="bot-controls" />;
  };
});

// Mock MobileDrawer
jest.mock('@/components/layout/MobileDrawer', () => ({
  MobileDrawer: ({ isOpen, onClose, title, children }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) => isOpen ? (
    <div data-testid="mobile-drawer">
      <div data-testid="drawer-backdrop" onClick={onClose} />
      <div data-testid="drawer-title">{title}</div>
      <div data-testid="drawer-content">{children}</div>
    </div>
  ) : null,
}));

// Mock cn utility
jest.mock('../lib/utils', () => ({
  cn: (...classes: (string | undefined | boolean)[]) => classes.filter(Boolean).join(' '),
}));

// Mock TvTutorialOverlay to avoid UI library dependency issues in tests
jest.mock('../host/components/tv-broadcast/TvTutorialOverlay', () => ({
  __esModule: true,
  default: () => null,
  isTvTutorialComplete: () => true,
  TvHelpButton: () => null,
}));

// Translation mock with preset-related keys
const mockTranslations: Record<string, string> = {
  'hostView.presetFast': 'Quick',
  'hostView.presetFastDesc': '1 min fast game',
  'hostView.presetFastDetails': 'Perfect for quick rounds!',
  'hostView.presetParty': 'Party',
  'hostView.presetPartyDesc': '2 min party mode',
  'hostView.presetPartyDetails': 'The classic party experience!',
  'hostView.presetChallenge': 'Challenge',
  'hostView.presetChallengeDesc': '3 min hard mode',
  'hostView.presetChallengeDetails': 'For serious word hunters!',
  'hostView.presetDrawerTimer': 'Timer',
  'hostView.presetDrawerBoard': 'Board Size',
  'hostView.presetDrawerMinWord': 'Min Word Length',
  'hostView.presetDrawerUseMode': 'Use This Mode',
  'hostView.presetDrawerBoardMedium': '7×7 (Medium)',
  'hostView.presetDrawerBoardHard': '9×9 (Hard)',
  'hostView.presetDrawerLetters': 'letters',
  'hostView.startGame': 'Start Game',
  'hostView.lobby': 'Lobby',
  'hostView.chat': 'Chat',
  'hostView.playersJoined': 'Players Joined',
  'hostView.waitingForPlayers': 'Waiting for players...',
  'hostView.broadcastModeTitle': 'TV Mode',
  'common.settings': 'Settings',
  'common.advancedSettings': 'More Options',
  'roomCode.copied': 'Copied!',
  'common.error': 'Error',
  'playerView.me': 'You',
  'hostView.battleMode': 'Battle Mode',
  'hostView.preset': 'Preset',
  'hostView.playersInRoom': 'Players in Room',
  'hostView.noOneYet': 'No one yet',
  'hostView.startingWithBots': 'Starting with bots in {seconds}s...',
  'hostView.shareCodeHint': 'Share the room code above so friends can join!',
  'hostView.inviteFriends': 'Invite Friends',
  'common.minutes': 'MIN',
};

const mockT = (key: string) => mockTranslations[key] || key;

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

// Helper: Battle Mode card is collapsed by default (progressive disclosure).
// Tests that interact with preset buttons must expand it first.
const expandBattleModeCard = () => {
  // Both desktop and mobile layouts render the Battle Mode card.
  // Click only the first one to toggle showBattleSettings to true.
  const battleModeButtons = screen.getAllByRole('button', { name: /battle mode/i });
  fireEvent.click(battleModeButtons[0]);
};

describe('HostPreGameView Preset Selection', () => {
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

    // Default preset (party) should be applied on mount
    await waitFor(() => {
      expect(setTimerValue).toHaveBeenCalledWith(2);
      expect(setDifficulty).toHaveBeenCalledWith('MEDIUM');
      expect(setMinWordLength).toHaveBeenCalledWith(2);
    });
  });

  it('directly applies Quick preset settings when clicking Quick button', async () => {
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

    // Wait for initial mount to complete
    await waitFor(() => {
      expect(setTimerValue).toHaveBeenCalledWith(2); // party default
    });

    jest.clearAllMocks();

    // Expand Battle Mode card to reveal preset buttons
    expandBattleModeCard();

    // Click a Quick preset button (both desktop and mobile buttons directly apply)
    const quickButtons = screen.getAllByRole('button', { name: /quick/i });
    fireEvent.click(quickButtons[0]);

    // Quick preset: 1 min timer, MEDIUM difficulty, 2 min word length
    await waitFor(() => {
      expect(setTimerValue).toHaveBeenCalledWith(1);
      expect(setDifficulty).toHaveBeenCalledWith('MEDIUM');
      expect(setMinWordLength).toHaveBeenCalledWith(2);
    });
  });

  it('directly applies Challenge preset settings when clicking Challenge button', async () => {
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

    // Wait for initial mount
    await waitFor(() => {
      expect(setTimerValue).toHaveBeenCalledWith(2);
    });

    jest.clearAllMocks();

    // Expand Battle Mode card to reveal preset buttons
    expandBattleModeCard();

    // Click a Challenge preset button
    const challengeButtons = screen.getAllByRole('button', { name: /challenge/i });
    fireEvent.click(challengeButtons[0]);

    // Challenge preset: 3 min timer, HARD difficulty, 3 min word length
    await waitFor(() => {
      expect(setTimerValue).toHaveBeenCalledWith(3);
      expect(setDifficulty).toHaveBeenCalledWith('HARD');
      expect(setMinWordLength).toHaveBeenCalledWith(3);
    });
  });

  it('directly applies Party preset settings when clicking Party button', async () => {
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

    // Wait for initial mount
    await waitFor(() => {
      expect(setTimerValue).toHaveBeenCalledWith(2);
    });

    jest.clearAllMocks();

    // Expand Battle Mode card to reveal preset buttons
    expandBattleModeCard();

    // Click a Party preset button (skip toggle buttons that also contain "Party" in their name)
    const partyButtons = screen.getAllByRole('button', { name: /party/i })
      .filter(btn => !btn.textContent?.includes('Battle Mode'));
    fireEvent.click(partyButtons[0]);

    // Party preset: 2 min timer, MEDIUM difficulty, 2 min word length
    await waitFor(() => {
      expect(setTimerValue).toHaveBeenCalledWith(2);
      expect(setDifficulty).toHaveBeenCalledWith('MEDIUM');
      expect(setMinWordLength).toHaveBeenCalledWith(2);
    });
  });

  it('does not open preset drawer (drawer is not wired to open)', async () => {
    render(<HostPreGameView {...defaultProps} />);

    // Expand Battle Mode card to reveal preset buttons
    expandBattleModeCard();

    // Click any preset button
    const quickButtons = screen.getAllByRole('button', { name: /quick/i });
    fireEvent.click(quickButtons[0]);

    // Drawer should NOT be visible since presetInfoOpen is never set to non-null
    expect(screen.queryByTestId('mobile-drawer')).not.toBeInTheDocument();
  });

  it('renders preset buttons in both desktop and mobile layouts', () => {
    render(<HostPreGameView {...defaultProps} />);

    // Expand Battle Mode card to reveal preset buttons
    expandBattleModeCard();

    // Both desktop and mobile layouts should have preset buttons
    // Desktop is in hidden lg:block div, mobile is in lg:hidden div
    // In jsdom, CSS is not applied, so both are rendered
    const quickButtons = screen.getAllByRole('button', { name: /quick/i });
    const partyButtons = screen.getAllByRole('button', { name: /party/i });
    const challengeButtons = screen.getAllByRole('button', { name: /challenge/i });

    // Each preset button appears in both desktop and mobile layouts
    expect(quickButtons.length).toBeGreaterThanOrEqual(2);
    expect(partyButtons.length).toBeGreaterThanOrEqual(2);
    expect(challengeButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('applies preset settings immediately on click (no intermediate step)', async () => {
    const setTimerValue = jest.fn();

    render(
      <HostPreGameView
        {...defaultProps}
        setTimerValue={setTimerValue}
      />
    );

    // Wait for initial useEffect to run (party preset initialization)
    await waitFor(() => {
      expect(setTimerValue).toHaveBeenCalledWith(2); // party preset timer
    });

    const initialCallCount = setTimerValue.mock.calls.length;

    // Expand Battle Mode card to reveal preset buttons
    expandBattleModeCard();

    // Click a Quick preset button
    const quickButtons = screen.getAllByRole('button', { name: /quick/i });
    fireEvent.click(quickButtons[0]);

    // setTimerValue should have been called again immediately (no drawer step)
    expect(setTimerValue).toHaveBeenCalledTimes(initialCallCount + 1);
    expect(setTimerValue).toHaveBeenLastCalledWith(1); // Quick = 1 min
  });
});
