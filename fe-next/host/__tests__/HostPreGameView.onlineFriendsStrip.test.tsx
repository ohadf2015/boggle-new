import { vi, describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
vi.mock('../../components/RoomChat', () => ({ __esModule: true, default: () => null }));
vi.mock('@/hooks/gameState', () => ({
  useGameMode: () => 'classic',
  useHostSelectedGameMode: () => 'classic',
  useGameActions: () => ({ setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }),
}));
vi.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ variant: 'off' }) }));
vi.mock('../components/pre-game/LobbyAudioButton', () => ({ LobbyAudioButton: () => null }));
vi.mock('@/components/lobby/LobbyReactions', () => ({ LobbyReactions: () => null }));
vi.mock('@/components/friends/FriendInviteList', () => ({ FriendInviteList: () => <div data-testid="invite-sheet-list" /> }));
vi.mock('@/components/multiplayer/lobby/LobbyOnlineFriends', () => ({
  LobbyOnlineFriends: ({ onMore }: { onMore: () => void }) => <button data-testid="online-strip" onClick={onMore} />,
}));

const t = (key: string) => key;
const props = {
  gameCode: 'ONE01', roomLanguage: 'en' as const, language: 'en' as const, username: 'Host', t,
  timerValue: 1.5, setTimerValue: vi.fn(), timerDirection: 0, setTimerDirection: vi.fn(),
  difficulty: 'MEDIUM' as const, setDifficulty: vi.fn(), minWordLength: 3, setMinWordLength: vi.fn(),
  gameType: 'regular' as const, setGameType: vi.fn(), tournamentRounds: 3, setTournamentRounds: vi.fn(), tournamentData: null,
  hostPlaying: true, setHostPlaying: vi.fn(),
  playersReady: [{ username: 'Host', isHost: true }],
  playerWordCounts: {}, shufflingGrid: null, highlightedCells: [], tableData: [['A']],
  onStartGame: vi.fn(), onExitRoom: vi.fn(), onCancelTournament: vi.fn(), tournamentCreating: false,
  autoStartSecondsLeft: 10,
};

describe('HostPreGameView online-friends strip', () => {
  afterEach(() => setLobbyViewport('phone'));

  it.each(['phone', 'desktop'] as const)('on %s: shows the strip, and +N opens the invite sheet', (vp) => {
    setLobbyViewport(vp);
    render(<HostPreGameView {...props} />);
    fireEvent.click(screen.getByTestId('online-strip'));
    expect(screen.getByTestId('invite-sheet-list')).toBeInTheDocument();
  });

  it('is hidden for private (classroom / quick play) rooms', () => {
    render(<HostPreGameView {...props} isPrivate />);
    expect(screen.queryByTestId('online-strip')).toBeNull();
  });
});
