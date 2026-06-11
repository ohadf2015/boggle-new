import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import HostPreGameView from '../components/HostPreGameView';

const emitMock = vi.fn();
const mockSocket = { emit: emitMock } as unknown as { emit: (...args: unknown[]) => void };

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
vi.mock('../components/pre-game/StartButton', () => ({ StartButton: () => null }));
vi.mock('../components/pre-game/MobileBottomNav', () => ({ MobileBottomNav: () => null }));
vi.mock('../components/pre-game/MobileShareSection', () => ({ MobileShareSection: () => null }));
vi.mock('../components/pre-game/PresetInfoDrawer', () => ({ PresetInfoDrawer: () => null }));
vi.mock('../components/pre-game/desktop', () => ({
  DesktopLobbyLayout: () => null,
  SettingsPanel: () => null,
  InviteCard: () => null,
  EnhancedPlayerList: () => null,
}));

// Capture the props HostPreGameView passes to LobbyReactions.
const lobbyReactionsProps: Array<Record<string, unknown>> = [];
vi.mock('@/components/lobby/LobbyReactions', () => ({
  LobbyReactions: (props: Record<string, unknown>) => {
    lobbyReactionsProps.push(props);
    return null;
  },
}));
vi.mock('@/components/lobby/LobbyRewardCluster', () => ({ LobbyRewardCluster: () => null }));
vi.mock('../components/HostPreGameView.useAvatarPremium', () => ({ useAvatarPremium: () => ({ allowed: true }) }), { virtual: true });

const mockT = (key: string) => key;

const baseProps = {
  gameCode: 'QUICK1',
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
  hostPlaying: true,
  setHostPlaying: vi.fn(),
  playersReady: [{ username: 'Host', isHost: true }],
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

describe('HostPreGameView lobby emote (LobbyReactions send tray)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lobbyReactionsProps.length = 0;
  });

  it('lets a PLAYING host send reactions (receiveOnly falsy) when hostPlaying=true', () => {
    render(<HostPreGameView {...baseProps} hostPlaying />);

    const props = lobbyReactionsProps.at(-1);
    expect(props).toBeDefined();
    expect(props!.username).toBe('Host');
    // Playing host is a competitor → must be able to fling emoji, not just watch.
    expect(props!.receiveOnly).toBeFalsy();
  });

  it('lets a scoreboard host (hostPlaying=false) send reactions too', () => {
    // HostPreGameView always runs on the host's own interactive device (true
    // cast-to-TV is the separate tv-broadcast/ components). A scoreboard host is
    // still a present person watching the lobby, so they must be able to fling
    // emoji like everyone else — not be stuck in receive-only.
    render(<HostPreGameView {...baseProps} hostPlaying={false} />);

    const props = lobbyReactionsProps.at(-1);
    expect(props).toBeDefined();
    expect(props!.receiveOnly).toBeFalsy();
  });

  it('anchors the emote trigger as a fixed floating button, not an in-flow orphan', () => {
    // The trigger used to render bare at the end of the root div, dropping into
    // document flow below the sticky start bar — a lone emoji floating bottom-left
    // that broke the layout. It must be a deliberate fixed-position FAB instead.
    render(<HostPreGameView {...baseProps} />);

    const fab = screen.getByTestId('host-lobby-emote-fab');
    expect(fab.className).toContain('fixed');
    // Mirrors the chat bubble (bottom corner), so the two FABs frame the start bar.
    expect(fab.className).toMatch(/bottom-/);
  });
});
