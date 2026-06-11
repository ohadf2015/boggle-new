import { vi, type Mock, } from 'vitest';
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
vi.mock('../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
}));

vi.mock('../../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    showInviteButton: vi.fn(),
    hideInviteButton: vi.fn(),
    isInviteButtonVisible: false,
  }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
  };
});

vi.mock('../../components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('../../components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

vi.mock('../../components/Avatar', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../../components/RoomChat', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../../components/PresenceIndicator', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../../components/BotControls', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/hooks/gameState', () => ({
  useGameMode: () => 'classic',
  useHostSelectedGameMode: () => 'random',
  useGameActions: () => ({
    setGameMode: vi.fn(),
    setHostSelectedGameMode: vi.fn(),
  }),
}));

vi.mock('../../hooks/useNativeShare', () => ({
  useNativeShare: () => ({
    canShare: false,
    share: vi.fn(),
  }),
}));

vi.mock('@/components/ui/DJMascot', () => ({
  DJMascotWithEntrance: () => null,
}));

vi.mock('@/components/GameModeSelector', () => ({
  GameModeSelector: () => null,
}));

vi.mock('../components/pre-game/PresetSelector', () => ({
  PresetSelector: () => null,
  GAME_PRESETS: {
    fast: { timer: 1, difficulty: 'EASY', nameKey: 'hostView.presetQuick' },
    party: { timer: 3, difficulty: 'EASY', nameKey: 'hostView.presetParty' },
    challenge: { timer: 5, difficulty: 'HARD', nameKey: 'hostView.presetPro' },
  },
}));

vi.mock('../components/pre-game/PlayerRoster', () => ({
  PlayerRoster: () => null,
}));

vi.mock('../components/pre-game/BattleModeCard', () => ({
  BattleModeCard: () => null,
}));

vi.mock('../components/pre-game/StartButton', () => ({
  StartButton: () => null,
}));

vi.mock('../components/pre-game/MobileBottomNav', () => ({
  MobileBottomNav: () => null,
}));

vi.mock('../components/pre-game/MobileShareSection', () => ({
  MobileShareSection: () => null,
}));

vi.mock('../components/pre-game/PresetInfoDrawer', () => ({
  PresetInfoDrawer: () => null,
}));

vi.mock('../components/pre-game/desktop', () => ({
  DesktopLobbyLayout: () => null,
  SettingsPanel: () => null,
  InviteCard: () => null,
  EnhancedPlayerList: () => null,
}));

// LobbyRewardCluster transitively pulls AdMobProvider (via useRewardedAd) and the
// theme/auth contexts; the tutorial test doesn't wrap in providers, so stub it to
// keep this suite focused on TV tutorial state. (Reward behavior is covered by the
// component's own tests.)
vi.mock('@/components/lobby/LobbyRewardCluster', () => ({ LobbyRewardCluster: () => null }));

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
    setTimerValue: vi.fn(),
    timerDirection: 0,
    setTimerDirection: vi.fn(),
    difficulty: 'EASY' as const,
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
    onRegenerateBoard: vi.fn(),
    tournamentCreating: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
