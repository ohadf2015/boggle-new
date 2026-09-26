import { vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import HostPreGameView from '../components/HostPreGameView';

const emitMock = vi.fn();
const mockSocket = { emit: emitMock, on: vi.fn(), off: vi.fn() } as unknown as { emit: (...args: unknown[]) => void };


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
vi.mock('@/hooks/gameState', () => ({
  useGameMode: () => 'classic',
  useHostSelectedGameMode: () => 'random',
  useGameActions: () => ({ setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }),
}));
vi.mock('../../hooks/useNativeShare', () => ({ useNativeShare: () => ({ canShare: false, share: vi.fn() }) }));
vi.mock('@/components/ui/DJMascot', () => ({ DJMascotWithEntrance: () => null }));
vi.mock('../components/pre-game/PresetSelector', () => ({
  PresetSelector: () => null,
  GAME_PRESETS: {
    fast: { timer: 1, difficulty: 'EASY', nameKey: 'hostView.presetQuick' },
    party: { timer: 3, difficulty: 'EASY', nameKey: 'hostView.presetParty' },
    challenge: { timer: 5, difficulty: 'HARD', nameKey: 'hostView.presetPro' },
  },
}));
vi.mock('../components/pre-game/MobileBottomNav', () => ({ MobileBottomNav: () => null }));
vi.mock('../components/pre-game/MobileShareSection', () => ({ MobileShareSection: () => null }));
vi.mock('../components/pre-game/LobbyAudioButton', () => ({ LobbyAudioButton: () => null }));
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


describe('HostPreGameView — lobby on the shell', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tapping the room code opens the invite sheet (QR + code + share)', async () => {
    render(<HostPreGameView {...baseProps} />);
    expect(screen.queryByTestId('lobby-invite-sheet')).toBeNull();
    fireEvent.click(screen.getByText('SOLO01').closest('button')!);
    const sheet = await screen.findByTestId('lobby-invite-sheet');
    expect(within(sheet).getByTestId('invite-code')).toHaveTextContent('SOLO01');
  });

  it('START says "vs bots" while no human has joined (replaces the pink banner)', () => {
    render(<HostPreGameView {...baseProps} hostPlaying playersReady={[{ username: 'Host', isHost: true }]} />);
    expect(within(within(screen.getByTestId('lobby-phone')).getByTestId('lobby-start')).getByText('mpUi.lobby.startVsBots')).toBeInTheDocument();
  });

  it('START shows the seat count once a human joined', () => {
    render(<HostPreGameView {...baseProps} hostPlaying playersReady={[{ username: 'Host', isHost: true }, { username: 'Ada', isHost: false }]} />);
    expect(within(within(screen.getByTestId('lobby-phone')).getByTestId('lobby-start')).getByText('mpUi.lobby.seatsTaken')).toBeInTheDocument();
  });

  it('phone footer: INVITE is an outlined secondary beside the one solid START', () => {
    render(<HostPreGameView {...baseProps} hostPlaying playersReady={[{ username: 'Host', isHost: true }]} />);
    const invite = within(screen.getByTestId('lobby-phone')).getByTestId('lobby-invite-button');
    // A solid cyan tile with a hard shadow competed with START BATTLE! at 390px.
    expect(invite.className).not.toMatch(/\bbg-neo-cyan(?![/\w-])/);
    expect(invite.className).not.toMatch(/\bshadow-hard(?![-\w])/);
    expect(invite.className).toContain('border-neo-cyan');
    expect(invite.className).toContain('text-neo-cyan');
  });

  it('a private room shows the head count instead of a shareable code, and no invite', () => {
    render(<HostPreGameView {...baseProps} isPrivate hostPlaying playersReady={[{ username: 'Host', isHost: true }]} />);
    expect(screen.queryByText('SOLO01')).toBeNull();
    expect(screen.getByTestId('lobby-count')).toHaveTextContent('1/8');
    expect(screen.queryByTestId('lobby-invite-button')).toBeNull();
  });

  it('chat opens in a sheet from the header — no floating chat FAB in the lobby', () => {
    render(<HostPreGameView {...baseProps} />);
    expect(screen.queryByTestId('chat-bubble')).toBeNull();
    fireEvent.click(screen.getByTestId('lobby-chat-button'));
    expect(screen.getByTestId('lobby-chat-sheet')).toBeInTheDocument();
  });
});
