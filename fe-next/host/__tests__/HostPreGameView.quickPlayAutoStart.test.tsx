import { vi } from 'vitest';
import React from 'react';
import { act, render } from '@testing-library/react';
import HostPreGameView, { QUICKPLAY_AUTO_FILL_SECONDS } from '../components/HostPreGameView';

const emitMock = vi.fn();
const mockSocket = { emit: emitMock, on: vi.fn(), off: vi.fn() } as unknown as { emit: (...args: unknown[]) => void };

vi.mock('../components/pre-game/StartButton', () => ({
  StartButton: (props: { disabled: boolean; onStartGame: () => void }) =>
    React.createElement('button', { disabled: props.disabled, onClick: props.onStartGame }, 'start'),
}));

vi.mock('../../utils/SocketContext', () => ({ useSocket: () => ({ socket: mockSocket }) }));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, isAuthenticated: false, updateProfile: vi.fn(), profile: null }),
}));

vi.mock('../../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({ showInviteButton: vi.fn(), hideInviteButton: vi.fn(), isInviteButtonVisible: false }),
}));

vi.mock('../../hooks/useCrazyGames', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));

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

const mockT = (key: string) => key;

const baseProps = {
  gameCode: 'QP0001',
  roomLanguage: 'en' as const,
  language: 'en' as const,
  username: 'Host',
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

/**
 * A Quick Play tap is an explicit request for "give me a game NOW". Filling the
 * lobby with bots and then waiting for a Start press strands the player in a
 * populated lobby with nothing happening — 41 of 117 such sessions (35%) never
 * started anything (PostHog, 2026-07-27 -> 2026-08-07; 93% of them first-24h
 * players). See docs/onboarding/2026-08-07-onboarding-friction-audit.md.
 */
describe('HostPreGameView — Quick Play auto-start after bot fill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Advance one second per act() call. The countdown re-registers its interval
   * from an effect keyed on the tick state, so a single bulk advance would run
   * every queued timer before React ever re-rendered and only tick once.
   */
  const tickSeconds = (seconds: number): void => {
    for (let i = 0; i < seconds; i += 1) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
  };

  const runCountdown = (): void => tickSeconds(QUICKPLAY_AUTO_FILL_SECONDS + 2);

  it('starts the game itself once the Quick Play bot-fill countdown expires', () => {
    render(<HostPreGameView {...baseProps} isQuickPlay />);

    runCountdown();

    expect(emitMock).toHaveBeenCalledWith('setAutoFill', { enabled: true, targetCount: 3 });
    // The whole point of Quick Play: the player must not have to find a Start button.
    expect(baseProps.onAutoStartWithBots).toHaveBeenCalledTimes(1);
  });

  it('does NOT auto-start a normal public room — that host keeps the explicit Start', () => {
    render(<HostPreGameView {...baseProps} isQuickPlay={false} />);

    // Alone-timer (15s) then the 20s "starting with bots" countdown.
    tickSeconds(40);

    expect(emitMock).toHaveBeenCalledWith('setAutoFill', { enabled: true, targetCount: 3 });
    expect(baseProps.onAutoStartWithBots).not.toHaveBeenCalled();
  });

  it('does not auto-start Quick Play when a human joined before the countdown expired', () => {
    const { rerender } = render(<HostPreGameView {...baseProps} isQuickPlay />);

    tickSeconds(2);
    // A real human lands in the lobby — cancel the rescue, this is a real match now.
    rerender(
      <HostPreGameView
        {...baseProps}
        isQuickPlay
        playersReady={[{ username: 'Rival', isHost: false }]}
      />,
    );
    runCountdown();

    expect(baseProps.onAutoStartWithBots).not.toHaveBeenCalled();
  });
});
