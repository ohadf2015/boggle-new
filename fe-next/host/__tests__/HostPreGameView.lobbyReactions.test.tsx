import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
// Render the roster's self-actions slot so the host emote tray flows through.
vi.mock('../components/pre-game/PlayerRoster', () => ({
  PlayerRoster: ({ selfActions }: { selfActions?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'roster-mock' }, selfActions as React.ReactNode),
}));
vi.mock('../components/pre-game/BattleModeCard', () => ({ BattleModeCard: () => null }));
vi.mock('../components/pre-game/StartButton', () => ({ StartButton: () => null }));
vi.mock('../components/pre-game/MobileBottomNav', () => ({ MobileBottomNav: () => null }));
vi.mock('../components/pre-game/MobileShareSection', () => ({ MobileShareSection: () => null }));
vi.mock('../components/pre-game/LobbyAudioButton', () => ({ LobbyAudioButton: () => null }));
vi.mock('../components/pre-game/PresetInfoDrawer', () => ({ PresetInfoDrawer: () => null }));
vi.mock('../components/pre-game/desktop', () => ({
  DesktopLobbyLayout: ({ leftContent }: { leftContent?: React.ReactNode }) =>
    React.createElement('div', null, leftContent as React.ReactNode),
  SettingsPanel: () => null,
  InviteCard: () => null,
  EnhancedPlayerList: () => null,
}));
// Avatar-part reward is the relocated lobby ad — stubbed (heavy deps) so the
// emote-tray assertions stay focused.
vi.mock('@/components/avatar/LobbyAvatarRewardButton', () => ({ LobbyAvatarRewardButton: () => null }));

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

describe('HostPreGameView lobby emote (avatar emotion picker)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes the old floating emoji FAB', () => {
    render(<HostPreGameView {...baseProps} />);
    // The reaction toy was replaced by an on-avatar emote picker — no orphan FAB.
    expect(screen.queryByTestId('host-lobby-emote-fab')).toBeNull();
  });

  it('renders an emote tray so the host can change their avatar emotion', () => {
    render(<HostPreGameView {...baseProps} />);
    // EmoteTray is fed through the roster self-actions slot.
    expect(screen.getAllByTestId('emote-tray').length).toBeGreaterThan(0);
  });

  it('emits a lobbyEmote over the socket when the host picks an emote', () => {
    render(<HostPreGameView {...baseProps} />);
    // Tap the first emote face → server-echoed lobbyEmote drives the face-swap.
    const laugh = screen.getAllByLabelText('lobby.emote.laugh')[0];
    fireEvent.click(laugh);
    expect(emitMock).toHaveBeenCalledWith('lobbyEmote', { emote: 'emoteLaugh' });
  });
});
