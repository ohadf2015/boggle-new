/**
 * HostPreGameView — classroom game-mode seeding.
 *
 * Bug: a teacher picks a game mode in ClassroomGameLobby (stored on
 * `lessonData.gameMode`), but the host pre-game selector seeded its mode from
 * the store default ('random') and never read `lessonData.gameMode`. The
 * `startGame` emit reads `hostSelectedGameMode`, so the teacher's choice was
 * silently dropped and the backend rolled a random mode instead.
 *
 * These tests assert the WIRING (the call site that feeds the emit), not a pure
 * helper: on mount the host's intent must equal the teacher's chosen mode.
 */
import { vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import HostPreGameView from '../components/HostPreGameView';

const { setHostSelectedGameModeMock } = vi.hoisted(() => ({
  setHostSelectedGameModeMock: vi.fn(),
}));

const emitMock = vi.fn();
const mockSocket = { emit: emitMock } as unknown as { emit: (...args: unknown[]) => void };

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
  // Store default — the bug is that the selector seeds from this and ignores
  // the teacher's classroom choice on lessonData.
  useHostSelectedGameMode: () => 'random',
  useGameActions: () => ({ setGameMode: vi.fn(), setHostSelectedGameMode: setHostSelectedGameModeMock }),
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
vi.mock('@/components/lobby/LobbyReactions', () => ({ LobbyReactions: () => null }));
vi.mock('@/components/boosts/BoostButton', () => ({ BoostButton: () => null }));
vi.mock('@/components/boosts/BoostPicker', () => ({ BoostPicker: () => null }));
vi.mock('../components/HostPreGameView.useAvatarPremium', () => ({ useAvatarPremium: () => ({ allowed: true }) }), { virtual: true });

const mockT = (key: string) => key;

const baseProps = {
  gameCode: 'CLASS1',
  roomLanguage: 'en' as const,
  language: 'en' as const,
  username: 'Teacher',
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
  playersReady: [{ username: 'Teacher', isHost: true }],
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

const lessonData = {
  lessonId: 'lesson-1',
  lessonName: 'Animals',
  vocabularyWords: ['CAT', 'DOG'],
  language: 'en' as const,
};

describe('HostPreGameView — classroom game-mode seeding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("seeds the host's selected mode from the teacher's classroom choice (lessonData.gameMode)", () => {
    render(<HostPreGameView {...baseProps} lessonData={{ ...lessonData, gameMode: 'word-hunt' }} />);

    // The mount effect pushes the seeded selection into the store, which is the
    // value the startGame emit later reads. It must be the teacher's choice.
    expect(setHostSelectedGameModeMock).toHaveBeenCalledWith('word-hunt');
    expect(setHostSelectedGameModeMock).not.toHaveBeenCalledWith('random');
  });

  it('honors the wheel-rush classroom mode', () => {
    render(<HostPreGameView {...baseProps} lessonData={{ ...lessonData, gameMode: 'wheel-rush' }} />);
    expect(setHostSelectedGameModeMock).toHaveBeenCalledWith('wheel-rush');
  });

  it('falls back to the store default (random) for non-classroom games (no lessonData)', () => {
    render(<HostPreGameView {...baseProps} lessonData={null} />);

    expect(setHostSelectedGameModeMock).toHaveBeenCalledWith('random');
    expect(setHostSelectedGameModeMock).not.toHaveBeenCalledWith('word-hunt');
  });
});
