/**
 * Desktop lobby right rail. DESIGN §3 moves chat out of the lobby body: the
 * r101 capture still spent the rail on an empty "Tell us your age" chat gate.
 * The rail is now invite + the round settings at a glance + a chat launcher
 * (unread count), and RoomChat mounts only inside the chat sheet.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import HostPreGameView from '../components/HostPreGameView';

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
vi.mock('../components/pre-game/desktop', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../components/pre-game/desktop')>()),
  InviteCard: () => <div data-testid="invite-card" />,
}));
vi.mock('@/components/lobby/LobbyReactions', () => ({ LobbyReactions: () => null }));

const t = (key: string) => key;
const props = {
  gameCode: 'RAIL01', roomLanguage: 'en' as const, language: 'en' as const, username: 'Host', t,
  timerValue: 1.5, setTimerValue: vi.fn(), timerDirection: 0, setTimerDirection: vi.fn(),
  difficulty: 'MEDIUM' as const, setDifficulty: vi.fn(), minWordLength: 3, setMinWordLength: vi.fn(),
  gameType: 'regular' as const, setGameType: vi.fn(), tournamentRounds: 3, setTournamentRounds: vi.fn(), tournamentData: null,
  hostPlaying: true, setHostPlaying: vi.fn(),
  playersReady: [{ username: 'Host', isHost: true }, { username: 'Ada', isHost: false }],
  playerWordCounts: {}, shufflingGrid: null, highlightedCells: [], tableData: [['A']],
  onStartGame: vi.fn(), onExitRoom: vi.fn(), onCancelTournament: vi.fn(), tournamentCreating: false,
};

const rail = () => within(screen.getByTestId('desktop-chat-area'));

describe('HostPreGameView — desktop right rail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no chat panel in the lobby body: RoomChat mounts only once the chat sheet opens', () => {
    render(<HostPreGameView {...props} />);
    expect(screen.queryByTestId('room-chat')).toBeNull();
    fireEvent.click(rail().getByTestId('lobby-chat-launcher'));
    expect(within(screen.getByTestId('lobby-chat-sheet')).getByTestId('room-chat')).toBeInTheDocument();
  });

  it('the rail shows the invite and the round settings at a glance', () => {
    render(<HostPreGameView {...props} />);
    expect(rail().getByTestId('invite-card')).toBeInTheDocument();
    const summary = rail().getByTestId('lobby-settings-summary');
    expect(summary).toHaveTextContent('1:30');
    expect(summary).toHaveTextContent('6×6');
  });

  it('tapping the settings summary opens the room settings dialog', async () => {
    render(<HostPreGameView {...props} />);
    fireEvent.click(rail().getByTestId('lobby-settings-summary'));
    expect(await screen.findByText('hostView.advancedSettings', { selector: 'h2' })).toBeInTheDocument();
  });
});
