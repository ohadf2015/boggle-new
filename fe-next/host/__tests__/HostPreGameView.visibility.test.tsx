// @vitest-environment happy-dom
import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
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
vi.mock('@/components/GameModeSelector', () => ({ GameModeSelector: () => null }));
vi.mock('@/components/multiplayer/lobby/gamePresets', () => ({
  GAME_PRESETS: {
    fast: { timer: 1, difficulty: 'EASY', nameKey: 'hostView.presetQuick' },
    party: { timer: 3, difficulty: 'EASY', nameKey: 'hostView.presetParty' },
    challenge: { timer: 5, difficulty: 'HARD', nameKey: 'hostView.presetPro' },
  },
}));
vi.mock('../components/pre-game/PlayerRoster', () => ({ PlayerRoster: () => null }));
vi.mock('../components/pre-game/BattleModeCard', () => ({ BattleModeCard: () => null }));
vi.mock('../components/pre-game/StartButton', () => ({ StartButton: () => null }));
vi.mock('../components/pre-game/MobileShareSection', () => ({ MobileShareSection: () => null }));
vi.mock('../components/pre-game/LobbyAudioButton', () => ({ LobbyAudioButton: () => null }));
vi.mock('../components/pre-game/desktop', () => ({
  DesktopLobbyLayout: () => null,
  InviteCard: () => null,
}));
vi.mock('@/components/lobby/LobbyReactions', () => ({ LobbyReactions: () => null }));

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
  onAutoStartWithBots: vi.fn(),
  onExitRoom: vi.fn(),
  onCancelTournament: vi.fn(),
  onRegenerateBoard: vi.fn(),
  tournamentCreating: false,
};

describe('HostPreGameView room visibility', () => {
  it.each(['public', 'friends', 'private'] as const)('Given a %s room, When the lobby shows, Then a chip names who can join', (v) => {
    render(<HostPreGameView {...baseProps} roomVisibility={v} />);
    const chip = screen.getByTestId('lobby-visibility-chip');
    expect(chip).toHaveAttribute('data-visibility', v);
    expect(chip).toHaveAccessibleName(`mpUi.entry.visibility: mpUi.entry.visibility${v[0].toUpperCase()}${v.slice(1)}`);
  });

  it('Given a private room, When the lobby shows, Then inviting is the primary action', () => {
    render(<HostPreGameView {...baseProps} roomVisibility="private" />);
    const invite = screen.getByTestId('lobby-invite-button');
    expect(invite).toHaveAttribute('data-primary', 'true');
    expect(invite).toHaveTextContent('mpUi.lobby.inviteTitle');
  });

  it('Given a public room, When the lobby shows, Then invite stays the small side button', () => {
    render(<HostPreGameView {...baseProps} roomVisibility="public" />);
    expect(screen.getByTestId('lobby-invite-button')).not.toHaveAttribute('data-primary');
  });

  it('Given a classroom or Quick Play room, When the lobby shows, Then no visibility chip appears', () => {
    render(<HostPreGameView {...baseProps} isPrivate roomVisibility="public" />);
    expect(screen.queryByTestId('lobby-visibility-chip')).toBeNull();
  });
});
