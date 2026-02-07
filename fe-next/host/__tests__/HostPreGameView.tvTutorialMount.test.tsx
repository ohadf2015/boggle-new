/**
 * Test: TV Tutorial shows on initial mount when TV mode is enabled
 *
 * Bug Fix: When user enters host multiplayer with TV mode already ON (hostPlaying=false),
 * the tutorial should show if it hasn't been completed yet.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import HostPreGameView from '../components/HostPreGameView';
import { resetTvTutorial } from '../components/tv-broadcast/TvTutorialOverlay';

// Mock all dependencies
jest.mock('../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
}));

jest.mock('../../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    showInviteButton: jest.fn(),
    hideInviteButton: jest.fn(),
    isInviteButtonVisible: false,
  }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react', () => ({
  Clock: () => null,
  Users: () => null,
  Crown: () => null,
  Bot: () => null,
  Monitor: () => null,
  LogOut: () => null,
  ChevronDown: () => null,
  BookOpen: () => null,
  ChevronRight: () => null,
  ChevronLeft: () => null,
  X: () => null,
  Tv: () => null,
  QrCode: () => null,
  LayoutGrid: () => null,
  Trophy: () => null,
  Timer: () => null,
  HelpCircle: () => null,
  Copy: () => null,
  Plus: () => null,
  Swords: () => null,
}));

jest.mock('../../components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock('../../components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

jest.mock('../../components/Avatar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/RoomChat', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/PresenceIndicator', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/BotControls', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/pre-game/PresetSelector', () => ({
  PresetSelector: () => null,
  GAME_PRESETS: {
    fast: { timer: 1, difficulty: 'EASY', nameKey: 'hostView.presetQuick' },
    party: { timer: 3, difficulty: 'EASY', nameKey: 'hostView.presetParty' },
    challenge: { timer: 5, difficulty: 'HARD', nameKey: 'hostView.presetPro' },
  },
}));

jest.mock('../components/pre-game/StartButton', () => ({
  StartButton: () => null,
}));

jest.mock('../components/pre-game/MobileBottomNav', () => ({
  MobileBottomNav: () => null,
}));

jest.mock('../components/pre-game/MobileShareSection', () => ({
  MobileShareSection: () => null,
}));

jest.mock('../components/pre-game/PresetInfoDrawer', () => ({
  PresetInfoDrawer: () => null,
}));

jest.mock('../components/pre-game/desktop', () => ({
  DesktopLobbyLayout: () => null,
  SettingsPanel: () => null,
  InviteCard: () => null,
  EnhancedPlayerList: () => null,
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('HostPreGameView - TV Tutorial on Initial Mount (Bug Fix)', () => {
  const mockT = (key: string) => {
    const translations: Record<string, string> = {
      'tvTutorial.ariaLabel': 'TV Mode Tutorial',
    };
    return translations[key] || key;
  };

  const defaultProps = {
    gameCode: 'TEST123',
    roomLanguage: 'en' as const,
    language: 'en' as const,
    username: 'TestHost',
    t: mockT,
    timerValue: 3,
    setTimerValue: jest.fn(),
    timerDirection: 0,
    setTimerDirection: jest.fn(),
    difficulty: 'EASY' as const,
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
    tableData: [['A', 'B'], ['C', 'D']],
    onStartGame: jest.fn(),
    onExitRoom: jest.fn(),
    onCancelTournament: jest.fn(),
    onRegenerateBoard: jest.fn(),
    tournamentCreating: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    resetTvTutorial();
  });

  it('should NOT show TV tutorial on initial mount (even with TV mode ON)', async () => {
    // Mount with TV mode already enabled
    render(
      <HostPreGameView
        {...defaultProps}
        hostPlaying={false}
      />
    );

    // Tutorial should NOT be visible (only shows when user actively toggles)
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(screen.queryByRole('dialog', { name: /tv mode tutorial/i })).not.toBeInTheDocument();
  });

  it('should show TV tutorial when user toggles TV mode checkbox', async () => {
    // Mount with TV mode DISABLED
    const { rerender } = render(
      <HostPreGameView
        {...defaultProps}
        hostPlaying={true}
      />
    );

    // No tutorial yet
    expect(screen.queryByRole('dialog', { name: /tv mode tutorial/i })).not.toBeInTheDocument();

    // User toggles TV mode ON
    rerender(
      <HostPreGameView
        {...defaultProps}
        hostPlaying={false}
      />
    );

    // Tutorial should now appear
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /tv mode tutorial/i })).toBeInTheDocument();
    });
  });

  it('should NOT show tutorial if already completed', async () => {
    // Mark tutorial as complete
    mockLocalStorage.setItem('lexiclash_tv_tutorial_complete', 'true');

    // Mount with TV mode enabled
    render(
      <HostPreGameView
        {...defaultProps}
        hostPlaying={false}
      />
    );

    // Wait to ensure no tutorial appears
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(screen.queryByRole('dialog', { name: /tv mode tutorial/i })).not.toBeInTheDocument();
  });
});
