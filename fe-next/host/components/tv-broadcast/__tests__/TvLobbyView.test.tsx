'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TvLobbyView from '../TvLobbyView';

// Mock Zustand game state hooks
vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => 'random',
  useHostSelectedGameMode: () => 'random',
}));

vi.mock('@/hooks/gameState', () => ({
  useGameActions: () => ({ setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }),
}));

// Mock sub-components to isolate TvLobbyView layout logic
vi.mock('../TvJoinBar', () => ({
  default: ({ gameCode }: { gameCode: string }) => (
    <div data-testid="tv-join-bar">JoinBar-{gameCode}</div>
  ),
}));

vi.mock('../../pre-game/PlayerRoster', () => ({
  PlayerRoster: ({ players }: { players: unknown[] }) => (
    <div data-testid="player-roster">Players: {players.length}</div>
  ),
}));

vi.mock('../../pre-game/StartButton', () => ({
  StartButton: ({ onStartGame, disabled }: { onStartGame: () => void; disabled?: boolean }) => (
    <button
      data-testid={disabled ? 'start-button-disabled' : 'start-button'}
      onClick={onStartGame}
      disabled={disabled}
    >
      Start
    </button>
  ),
}));

vi.mock('../../pre-game/BattleModeCard', () => ({
  BattleModeCard: ({ selectedGameMode }: { selectedGameMode: string }) => (
    <div data-testid="battle-mode-card">Mode: {selectedGameMode}</div>
  ),
}));

// Receive-only emoji overlay — needs a SocketProvider at runtime; stub it out
// here so TvLobbyView layout logic stays isolated.
vi.mock('@/components/lobby/LobbyReactions', () => ({
  LobbyReactions: () => <div data-testid="lobby-reactions" />,
}));

const mockT = (key: string) => key;

const defaultProps = {
  gameCode: 'ABC123',
  roomLanguage: 'en' as const,
  username: 'HostUser',
  t: mockT,
  playersReady: [
    { username: 'Player1', avatar: null },
    { username: 'Player2', avatar: null },
  ],
  selectedGameMode: 'random' as const,
  setSelectedGameMode: vi.fn(),
  timerValue: 120,
  difficulty: 'normal' as const,
  onStartGame: vi.fn(),
  onExitRoom: vi.fn(),
  tournamentCreating: false,
};

describe('TvLobbyView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders TvJoinBar with game code', () => {
    render(<TvLobbyView {...defaultProps} />);
    expect(screen.getByTestId('tv-join-bar')).toHaveTextContent('ABC123');
  });

  it('renders PlayerRoster with players', () => {
    render(<TvLobbyView {...defaultProps} />);
    expect(screen.getByTestId('player-roster')).toHaveTextContent('Players: 2');
  });

  it('excludes host from PlayerRoster count (TV mode = host not playing)', () => {
    render(<TvLobbyView
      {...defaultProps}
      username="HostUser"
      playersReady={[
        { username: 'HostUser', avatar: null, isHost: true },
        { username: 'Player1', avatar: null },
        { username: 'Player2', avatar: null },
      ]}
    />);
    expect(screen.getByTestId('player-roster')).toHaveTextContent('Players: 2');
  });

  it('excludes host even when isHost flag missing — falls back to username match', () => {
    render(<TvLobbyView
      {...defaultProps}
      username="HostUser"
      playersReady={[
        { username: 'HostUser', avatar: null },
        { username: 'Player1', avatar: null },
      ]}
    />);
    expect(screen.getByTestId('player-roster')).toHaveTextContent('Players: 1');
  });

  it('disables StartButton when only host is in room', () => {
    const onStart = vi.fn();
    render(<TvLobbyView
      {...defaultProps}
      onStartGame={onStart}
      username="HostUser"
      playersReady={[{ username: 'HostUser', avatar: null, isHost: true }]}
    />);
    expect(screen.getByTestId('start-button-disabled')).toBeInTheDocument();
  });

  it('renders StartButton', () => {
    render(<TvLobbyView {...defaultProps} />);
    expect(screen.getByTestId('start-button')).toBeInTheDocument();
  });

  it('renders BattleModeCard with selected mode', () => {
    render(<TvLobbyView {...defaultProps} />);
    expect(screen.getByTestId('battle-mode-card')).toHaveTextContent('Mode: random');
  });

  it('renders lobby title translation key', () => {
    render(<TvLobbyView {...defaultProps} />);
    expect(screen.getByText('tvLobby.waitingForPlayers')).toBeInTheDocument();
  });

  it('renders game settings summary (timer + difficulty)', () => {
    render(<TvLobbyView {...defaultProps} />);
    // Should show timer and difficulty in a settings summary area
    expect(screen.getByTestId('tv-lobby-settings')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('passes onStartGame to StartButton', () => {
    render(<TvLobbyView {...defaultProps} />);
    screen.getByTestId('start-button').click();
    expect(defaultProps.onStartGame).toHaveBeenCalled();
  });

  it('has tv-lobby-view root testid', () => {
    render(<TvLobbyView {...defaultProps} />);
    expect(screen.getByTestId('tv-lobby-view')).toBeInTheDocument();
  });

  it('shows a persistent view-only badge so hosts know they are not playing', () => {
    render(<TvLobbyView {...defaultProps} />);
    expect(screen.getByText('tvLobby.viewOnlyBadge')).toBeInTheDocument();
  });

  it('renders the Switch to Player Mode exit button when setHostPlaying is provided', () => {
    render(<TvLobbyView {...defaultProps} setHostPlaying={vi.fn()} />);
    expect(screen.getByTestId('switch-to-player-mode')).toBeInTheDocument();
  });

  it('exits TV mode by calling setHostPlaying(true) when the exit button is clicked', () => {
    const setHostPlaying = vi.fn();
    render(<TvLobbyView {...defaultProps} setHostPlaying={setHostPlaying} />);
    fireEvent.click(screen.getByTestId('switch-to-player-mode'));
    expect(setHostPlaying).toHaveBeenCalledWith(true);
  });
});
