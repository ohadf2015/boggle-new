/**
 * Tests for HostPreGameView preset drawer functionality
 *
 * Tests the preset explanation drawer feature:
 * - Clicking preset opens drawer instead of directly applying
 * - Drawer displays mode info and settings breakdown
 * - "Use This Mode" button applies preset and closes drawer
 * - Drawer closes when clicking backdrop
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Mock MobileDrawer - use the exact import path from the component
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

describe('HostPreGameView Preset Drawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens drawer when clicking a preset button', async () => {
    render(<HostPreGameView {...defaultProps} />);

    // Initially drawer should not be visible
    expect(screen.queryByTestId('mobile-drawer')).not.toBeInTheDocument();

    // Click the Party preset button (contains "Party" text)
    const partyButton = screen.getByRole('button', { name: /party/i });
    fireEvent.click(partyButton);

    // Drawer should now be visible
    await waitFor(() => {
      expect(screen.getByTestId('mobile-drawer')).toBeInTheDocument();
    });
  });

  it('displays preset name in drawer title', async () => {
    render(<HostPreGameView {...defaultProps} />);

    // Click the Quick preset
    const quickButton = screen.getByRole('button', { name: /quick/i });
    fireEvent.click(quickButton);

    await waitFor(() => {
      expect(screen.getByTestId('drawer-title')).toHaveTextContent('Quick');
    });
  });

  it('displays preset details and settings in drawer', async () => {
    render(<HostPreGameView {...defaultProps} />);

    // Click the Challenge preset
    const challengeButton = screen.getByRole('button', { name: /challenge/i });
    fireEvent.click(challengeButton);

    await waitFor(() => {
      // Should show detailed description
      expect(screen.getByText('For serious word hunters!')).toBeInTheDocument();

      // Should show settings
      expect(screen.getByText('Timer')).toBeInTheDocument();
      expect(screen.getByText('3 min')).toBeInTheDocument();
      expect(screen.getByText('Board Size')).toBeInTheDocument();
      expect(screen.getByText('9×9 (Hard)')).toBeInTheDocument();
      expect(screen.getByText('Min Word Length')).toBeInTheDocument();
      expect(screen.getByText(/3.*letters/)).toBeInTheDocument();
    });
  });

  it('applies preset and closes drawer when clicking "Use This Mode"', async () => {
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

    // Open the Quick preset drawer
    const quickButton = screen.getByRole('button', { name: /quick/i });
    fireEvent.click(quickButton);

    await waitFor(() => {
      expect(screen.getByTestId('mobile-drawer')).toBeInTheDocument();
    });

    // Click "Use This Mode" button
    const useThisModeButton = screen.getByRole('button', { name: /use this mode/i });
    fireEvent.click(useThisModeButton);

    // Should apply preset settings (Quick = 1 min, MEDIUM, 2 letters)
    expect(setTimerValue).toHaveBeenCalledWith(1);
    expect(setDifficulty).toHaveBeenCalledWith('MEDIUM');
    expect(setMinWordLength).toHaveBeenCalledWith(2);

    // Drawer should close
    await waitFor(() => {
      expect(screen.queryByTestId('mobile-drawer')).not.toBeInTheDocument();
    });
  });

  it('closes drawer when clicking backdrop', async () => {
    render(<HostPreGameView {...defaultProps} />);

    // Open drawer
    const partyButton = screen.getByRole('button', { name: /party/i });
    fireEvent.click(partyButton);

    await waitFor(() => {
      expect(screen.getByTestId('mobile-drawer')).toBeInTheDocument();
    });

    // Click backdrop to close
    const backdrop = screen.getByTestId('drawer-backdrop');
    fireEvent.click(backdrop);

    // Drawer should close
    await waitFor(() => {
      expect(screen.queryByTestId('mobile-drawer')).not.toBeInTheDocument();
    });
  });

  it('shows correct board size for each difficulty level', async () => {
    render(<HostPreGameView {...defaultProps} />);

    // Test Party preset (MEDIUM = 7×7)
    const partyButton = screen.getByRole('button', { name: /party/i });
    fireEvent.click(partyButton);

    await waitFor(() => {
      expect(screen.getByText('7×7 (Medium)')).toBeInTheDocument();
    });

    // Close and test Challenge preset (HARD = 9×9)
    const backdrop = screen.getByTestId('drawer-backdrop');
    fireEvent.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByTestId('mobile-drawer')).not.toBeInTheDocument();
    });

    const challengeButton = screen.getByRole('button', { name: /challenge/i });
    fireEvent.click(challengeButton);

    await waitFor(() => {
      expect(screen.getByText('9×9 (Hard)')).toBeInTheDocument();
    });
  });

  it('does not directly apply preset on button click (drawer opens instead)', async () => {
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

    // Click preset button
    const quickButton = screen.getByRole('button', { name: /quick/i });
    fireEvent.click(quickButton);

    // Drawer should open but preset should NOT be applied yet
    await waitFor(() => {
      expect(screen.getByTestId('mobile-drawer')).toBeInTheDocument();
    }, { timeout: 5000 });

    // setTimerValue should NOT have been called again (drawer just opens, doesn't apply)
    expect(setTimerValue).toHaveBeenCalledTimes(initialCallCount);
  });
});
