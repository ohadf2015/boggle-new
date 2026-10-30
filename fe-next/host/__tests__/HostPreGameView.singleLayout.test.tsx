import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import HostPreGameView from '../components/HostPreGameView';
import { setLobbyViewport } from '@/components/multiplayer/lobby/__tests__/lobbyViewport';

const mockSocket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
vi.mock('../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: mockSocket }),
  useSocketOptional: () => ({ socket: mockSocket }),
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, isAuthenticated: false, updateProfile: vi.fn(), profile: null }),
}));
vi.mock('../../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({ showInviteButton: vi.fn(), hideInviteButton: vi.fn(), isInviteButtonVisible: false }),
}));
vi.mock('../../components/Avatar', () => ({ __esModule: true, default: () => null }));
vi.mock('../../components/RoomChat', () => ({ __esModule: true, default: () => <div data-testid="room-chat" /> }));
vi.mock('@/hooks/gameState', () => ({
  useGameMode: () => 'classic',
  useHostSelectedGameMode: () => 'classic',
  useGameActions: () => ({ setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }),
}));
vi.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ variant: 'off' }) }));
vi.mock('../components/pre-game/LobbyAudioButton', () => ({ LobbyAudioButton: () => null }));
vi.mock('@/components/lobby/LobbyReactions', () => ({ LobbyReactions: () => null }));

const t = (key: string) => key;
const props = {
  gameCode: 'ONE01', roomLanguage: 'en' as const, language: 'en' as const, username: 'Host', t,
  timerValue: 1.5, setTimerValue: vi.fn(), timerDirection: 0, setTimerDirection: vi.fn(),
  difficulty: 'MEDIUM' as const, setDifficulty: vi.fn(), minWordLength: 3, setMinWordLength: vi.fn(),
  gameType: 'regular' as const, setGameType: vi.fn(), tournamentRounds: 3, setTournamentRounds: vi.fn(), tournamentData: null,
  hostPlaying: true, setHostPlaying: vi.fn(),
  playersReady: [{ username: 'Host', isHost: true }, { username: 'Ada', isHost: false }],
  playerWordCounts: {}, shufflingGrid: null, highlightedCells: [], tableData: [['A']],
  onStartGame: vi.fn(), onExitRoom: vi.fn(), onCancelTournament: vi.fn(), tournamentCreating: false,
  autoStartSecondsLeft: 10,
};

describe('HostPreGameView mounts one layout', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => setLobbyViewport('phone'));

  it('on a phone: only the phone tree, one status lane, one start button', () => {
    setLobbyViewport('phone');
    render(<HostPreGameView {...props} />);
    expect(screen.getByTestId('lobby-phone')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-chat-area')).toBeNull();
    expect(screen.getAllByTestId('host-status-lane')).toHaveLength(1);
    expect(screen.getAllByTestId('lobby-start')).toHaveLength(1);
  });

  it('on desktop: only the desktop tree, one status lane, one start button', () => {
    setLobbyViewport('desktop');
    render(<HostPreGameView {...props} />);
    expect(screen.getByTestId('desktop-chat-area')).toBeInTheDocument();
    expect(screen.queryByTestId('lobby-phone')).toBeNull();
    expect(screen.queryByTestId('lobby-phone-footer')).toBeNull();
    expect(screen.getAllByTestId('host-status-lane')).toHaveLength(1);
    expect(screen.getAllByTestId('lobby-start')).toHaveLength(1);
  });
});
