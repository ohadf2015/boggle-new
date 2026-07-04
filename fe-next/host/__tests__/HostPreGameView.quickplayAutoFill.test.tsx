import { vi } from 'vitest';
import React from 'react';
import { act, render } from '@testing-library/react';

// Mock analytics first (before importing the component that uses it)
vi.mock('@/utils/posthogEngagement', () => ({
  trackSoloPlayPrompt: vi.fn(),
}));

import HostPreGameView, { QUICKPLAY_AUTO_FILL_SECONDS } from '../components/HostPreGameView';
import { trackSoloPlayPrompt } from '@/utils/posthogEngagement';

const emitMock = vi.fn();
const mockSocket = { emit: emitMock, on: vi.fn(), off: vi.fn() } as unknown as { emit: (...args: unknown[]) => void };

let capturedStartProps: { disabled: boolean; onStartGame: () => void } | null = null;
vi.mock('../components/pre-game/StartButton', () => ({
  StartButton: (props: { disabled: boolean; onStartGame: () => void }) => {
    capturedStartProps = props;
    return React.createElement('button', { disabled: props.disabled, onClick: props.onStartGame }, 'start');
  },
}));

vi.mock('../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: mockSocket }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAdmin: false,
    isAuthenticated: false,
    updateProfile: vi.fn(),
    profile: null,
  }),
}));

vi.mock('../../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    showInviteButton: vi.fn(),
    hideInviteButton: vi.fn(),
    isInviteButtonVisible: false,
  }),
}));

vi.mock('../../hooks/useCrazyGames', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...props }: { children?: React.ReactNode; [k: string]: unknown }) =>
      React.createElement('div', props, children as React.ReactNode),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

vi.mock('lucide-react', async (importOriginal) => ({ ...(await importOriginal<typeof import('lucide-react')>()) }));

vi.mock('../../components/ui/button', () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [k: string]: unknown }) =>
    React.createElement('button', props, children as React.ReactNode),
}));
vi.mock('../../components/ui/checkbox', () => ({ Checkbox: () => null }));
vi.mock('../../components/Avatar', () => ({ __esModule: true, default: () => null }));
vi.mock('../../components/RoomChat', () => ({ __esModule: true, default: () => null }));
vi.mock('../../components/PresenceIndicator', () => ({ __esModule: true, default: () => null }));
vi.mock('../../components/BotControls', () => ({ __esModule: true, default: () => null }));
vi.mock('@/hooks/gameState', () => ({
  useGameMode: () => 'classic',
  useHostSelectedGameMode: () => 'random',
  useGameActions: () => ({ setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }),
}));
vi.mock('../../hooks/useNativeShare', () => ({ useNativeShare: () => ({ canShare: false, share: vi.fn() }) }));
vi.mock('@/components/ui/DJMascot', () => ({ DJMascotWithEntrance: () => null }));
vi.mock('@/components/GameModeSelector', () => ({ GameModeSelector: () => null }));
vi.mock('../components/pre-game/PresetSelector', () => ({
  PresetSelector: () => null,
  GAME_PRESETS: {
    fast: { timer: 1, difficulty: 'EASY', nameKey: 'hostView.presetQuick' },
    party: { timer: 3, difficulty: 'EASY', nameKey: 'hostView.presetParty' },
    challenge: { timer: 5, difficulty: 'HARD', nameKey: 'hostView.presetPro' },
  },
}));
vi.mock('../components/pre-game/PlayerRoster', () => ({ PlayerRoster: () => null }));
vi.mock('../components/pre-game/BattleModeCard', () => ({ BattleModeCard: () => null }));
vi.mock('../components/pre-game/MobileBottomNav', () => ({ MobileBottomNav: () => null }));
vi.mock('../components/pre-game/MobileShareSection', () => ({ MobileShareSection: () => null }));
vi.mock('../components/pre-game/LobbyAudioButton', () => ({ LobbyAudioButton: () => null }));
vi.mock('../components/pre-game/PresetInfoDrawer', () => ({ PresetInfoDrawer: () => null }));
vi.mock('../components/pre-game/desktop', () => ({
  DesktopLobbyLayout: () => null,
  SettingsPanel: () => null,
  InviteCard: () => null,
  EnhancedPlayerList: () => null,
}));
vi.mock('@/components/lobby/LobbyReactions', () => ({ LobbyReactions: () => null }));
vi.mock('@/components/lobby/LobbyRewardCluster', () => ({ LobbyRewardCluster: () => null }));
vi.mock('../components/HostPreGameView.useAvatarPremium', () => ({ useAvatarPremium: () => ({ allowed: true }) }), { virtual: true });

const mockT = (key: string) => key;

const baseProps = {
  gameCode: 'QP01',
  roomLanguage: 'en' as const,
  language: 'en' as const,
  username: 'QuickPlayHost',
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
  hostPlaying: false,
  setHostPlaying: vi.fn(),
  playersReady: [] as Array<{ username: string; isHost: boolean }>,
  playerWordCounts: {},
  shufflingGrid: null,
  highlightedCells: [],
  tableData: [['A', 'B'], ['C', 'D']],
  onStartGame: vi.fn(),
  onAutoStartWithBots: vi.fn(),
  onExitRoom: vi.fn(),
  onCancelTournament: vi.fn(),
  onRegenerateBoard: vi.fn(),
  tournamentCreating: false,
};

describe('HostPreGameView quickplay auto-fill timer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedStartProps = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports configurable QUICKPLAY_AUTO_FILL_SECONDS constant', () => {
    expect(QUICKPLAY_AUTO_FILL_SECONDS).toBe(5);
  });

  it('starts bot countdown immediately when quickplay host is alone', () => {
    render(
      <HostPreGameView
        {...baseProps}
        isQuickPlay={true}
        playersReady={[]}
      />
    );

    // No manual timer needed — the countdown effect fires immediately
    expect(emitMock).not.toHaveBeenCalledWith('setAutoFill', expect.anything());
  });

  it('auto-fills with bots after 5 seconds when quickplay host alone', () => {
    render(
      <HostPreGameView
        {...baseProps}
        isQuickPlay={true}
        playersReady={[]}
      />
    );

    // Fast-forward to the countdown expiration
    act(() => {
      vi.advanceTimersByTime(QUICKPLAY_AUTO_FILL_SECONDS * 1000);
    });

    // Should emit setAutoFill to the server
    expect(emitMock).toHaveBeenCalledWith('setAutoFill', {
      enabled: true,
      targetCount: 3,
    });

    // Bots are added, but the game must NOT auto-start — MP mode only ever
    // starts on the host's explicit action (Play button / "Play vs Bots" card).
    expect(baseProps.onAutoStartWithBots).not.toHaveBeenCalled();
    expect(baseProps.onStartGame).not.toHaveBeenCalled();
  });

  it('tracks auto-fill with auto_filled: true when timer expires', () => {
    render(
      <HostPreGameView
        {...baseProps}
        isQuickPlay={true}
        playersReady={[]}
      />
    );

    act(() => {
      vi.advanceTimersByTime(QUICKPLAY_AUTO_FILL_SECONDS * 1000);
    });

    // Should track with auto_filled: true
    expect(trackSoloPlayPrompt).toHaveBeenCalledWith({
      event: 'shown',
      auto_filled: true,
    });
  });

  it('cancels quickplay auto-fill when a human joins', () => {
    const { rerender } = render(
      <HostPreGameView
        {...baseProps}
        isQuickPlay={true}
        playersReady={[]}
      />
    );

    // A human joins the room before timer expires
    rerender(
      <HostPreGameView
        {...baseProps}
        isQuickPlay={true}
        playersReady={[{ username: 'Guest', isHost: false }]}
      />
    );

    // Fast-forward past what would be the timer
    act(() => {
      vi.advanceTimersByTime(QUICKPLAY_AUTO_FILL_SECONDS * 1000);
    });

    // Should NOT auto-fill since a human joined
    expect(emitMock).not.toHaveBeenCalledWith('setAutoFill', expect.anything());
  });

  it('does NOT auto-fill non-quickplay public rooms at 5 seconds (waits for 15s alone timer)', () => {
    render(
      <HostPreGameView
        {...baseProps}
        isQuickPlay={false}
        isPrivate={false}
        playersReady={[]}
      />
    );

    // Should NOT emit setAutoFill at 5 seconds (quickplay rate)
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(emitMock).not.toHaveBeenCalledWith('setAutoFill', expect.anything());

    // Still should NOT emit at 14.9s (before the 15s alone-timer fires)
    act(() => {
      vi.advanceTimersByTime(9900);
    });
    expect(emitMock).not.toHaveBeenCalledWith('setAutoFill', expect.anything());
  });
});
