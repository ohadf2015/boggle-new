import { vi } from 'vitest';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import HostPreGameView from '../components/HostPreGameView';

const emitMock = vi.fn();
const mockSocket = { emit: emitMock } as unknown as { emit: (...args: unknown[]) => void };

// Capture the props the StartButton is rendered with so we can assert its
// disabled state AND invoke its onStartGame exactly as a real click would.
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
  gameCode: 'SOLO01',
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

describe('HostPreGameView solo-host start (alone in lobby)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedStartProps = null;
  });

  it('leaves the Start button ENABLED when the host is alone (no human guests)', () => {
    // playersReady=[] + hostPlaying=false → actualPlayerCount === 0
    render(<HostPreGameView {...baseProps} />);

    expect(capturedStartProps).not.toBeNull();
    // A new host must be able to press Start instead of being trapped waiting.
    expect(capturedStartProps!.disabled).toBe(false);
  });

  it('fills bots AND starts immediately when an alone host presses Start', () => {
    render(<HostPreGameView {...baseProps} />);

    act(() => { capturedStartProps!.onStartGame(); });

    const setAutoFill = emitMock.mock.calls.find(([evt]) => evt === 'setAutoFill');
    expect(setAutoFill).toBeDefined();
    expect(setAutoFill![1]).toEqual({ enabled: true, targetCount: 3 });
    expect(baseProps.onStartGame).toHaveBeenCalled();
  });

  it('fills bots on Start for a PLAYING host alone (hostPlaying=true, host in roster)', () => {
    // Dominant mobile path: hostPlaying is forced true and the host IS in
    // playersReady, so actualPlayerCount===1 — yet there are no human opponents.
    render(
      <HostPreGameView
        {...baseProps}
        hostPlaying={true}
        playersReady={[{ username: 'Host', isHost: true }]}
      />,
    );

    act(() => { capturedStartProps!.onStartGame(); });

    const setAutoFill = emitMock.mock.calls.find(([evt]) => evt === 'setAutoFill');
    expect(setAutoFill).toBeDefined();
    expect(setAutoFill![1]).toEqual({ enabled: true, targetCount: 3 });
    expect(baseProps.onStartGame).toHaveBeenCalled();
  });

  it('does NOT force bot-fill when a human guest is already present', () => {
    render(
      <HostPreGameView
        {...baseProps}
        playersReady={[{ username: 'Guest', isHost: false }]}
      />,
    );

    act(() => { capturedStartProps!.onStartGame(); });

    const setAutoFill = emitMock.mock.calls.find(([evt]) => evt === 'setAutoFill');
    expect(setAutoFill).toBeUndefined();
    expect(baseProps.onStartGame).toHaveBeenCalled();
  });
});

describe('HostPreGameView passive bot auto-fill timer (alone host)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedStartProps = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-fills bots after the (shortened) alone timer in a PUBLIC room', () => {
    render(<HostPreGameView {...baseProps} isPrivate={false} />);

    act(() => { vi.advanceTimersByTime(15_000); }); // alone timer
    act(() => { vi.advanceTimersByTime(10_000); }); // bot countdown → 0

    const setAutoFill = emitMock.mock.calls.find(([evt]) => evt === 'setAutoFill');
    expect(setAutoFill).toBeDefined();
    // Passive rescue must start DIRECTLY with bots — NOT via the solo-confirm
    // popup path (onStartGame → startGame → setShowSoloConfirm). An abandoned
    // host never clicks a modal, so a popup here would strand the lobby forever.
    expect(baseProps.onAutoStartWithBots).toHaveBeenCalled();
    expect(baseProps.onStartGame).not.toHaveBeenCalled();
  });

  it('does NOT auto-fill via the timer in a PRIVATE (invite/classroom) room', () => {
    render(<HostPreGameView {...baseProps} isPrivate={true} />);

    // Same stepped advance the PUBLIC case uses (so the countdown genuinely runs),
    // yet a private room never force-fills: the host is waiting on invited humans.
    // They can still press Start to fill on demand.
    act(() => { vi.advanceTimersByTime(15_000); });
    act(() => { vi.advanceTimersByTime(10_000); });

    const setAutoFill = emitMock.mock.calls.find(([evt]) => evt === 'setAutoFill');
    expect(setAutoFill).toBeUndefined();
  });
});

/**
 * Integration: the "play vs bots" prompt must actually be ON SCREEN for a solo
 * public host — not merely rendered in component isolation. Two prior backend
 * fixes (solo-vs-bots start, auto-start) shipped green and the drop number did
 * not move precisely because they made the engine capable without telling the
 * host; this surface is the communication. If it doesn't render, the fix is moot.
 */
describe('HostPreGameView solo "play vs bots" prompt visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedStartProps = null;
  });

  const cta = 'hostView.soloPrompt.cta'; // mockT echoes the key

  it('renders the play-vs-bots card for a PUBLIC host alone in the lobby', () => {
    render(<HostPreGameView {...baseProps} isPrivate={false} />);
    expect(screen.getByText(cta)).toBeInTheDocument();
  });

  it('renders the card for a PLAYING host alone (hostPlaying=true, host in roster)', () => {
    render(
      <HostPreGameView
        {...baseProps}
        hostPlaying={true}
        playersReady={[{ username: 'Host', isHost: true }]}
      />,
    );
    expect(screen.getByText(cta)).toBeInTheDocument();
  });

  it('does NOT render the card once a human guest is present', () => {
    render(
      <HostPreGameView
        {...baseProps}
        playersReady={[{ username: 'Guest', isHost: false }]}
      />,
    );
    expect(screen.queryByText(cta)).not.toBeInTheDocument();
  });

  it('does NOT render the card for a PRIVATE/classroom host (they wait on specific humans)', () => {
    render(<HostPreGameView {...baseProps} isPrivate={true} />);
    expect(screen.queryByText(cta)).not.toBeInTheDocument();
  });

  it('pressing the card CTA fills bots and starts the game', () => {
    render(<HostPreGameView {...baseProps} isPrivate={false} />);
    act(() => { screen.getByText(cta).click(); });

    const setAutoFill = emitMock.mock.calls.find(([evt]) => evt === 'setAutoFill');
    expect(setAutoFill).toEqual(['setAutoFill', { enabled: true, targetCount: 3 }]);
    expect(baseProps.onStartGame).toHaveBeenCalled();
  });
});
