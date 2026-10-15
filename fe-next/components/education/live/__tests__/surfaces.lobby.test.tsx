import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvLobbyView from '@/host/components/tv-broadcast/TvLobbyView';
import { EduLiveSurfacesProvider } from '@/components/education/live/eduLiveSurfaces';

vi.mock('framer-motion', () => ({
  m: { h1: 'h1', div: 'div', button: 'button', span: 'span', p: 'p', li: 'li', ul: 'ul' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => true,
}));

vi.mock('@/host/components/tv-broadcast/TvJoinBar', () => ({
  default: () => <div data-testid="tv-join-bar" />,
}));

vi.mock('@/components/education/projector/ProjectorLobby', () => ({
  default: (props: {
    gameCode: string;
    startLabelKey: string;
    students: { username: string }[];
    readyUsernames?: string[];
  }) => (
    <div
      data-testid="projector-lobby"
      data-code={props.gameCode}
      data-label={props.startLabelKey}
      data-students={props.students.map((s) => s.username).join(',')}
      data-ready={(props.readyUsernames ?? []).join(',')}
    />
  ),
}));

vi.mock('@/host/components/pre-game/PlayerRoster', () => ({
  PlayerRoster: () => <div data-testid="player-roster" />,
}));
vi.mock('@/host/components/pre-game/BattleModeCard', () => ({
  BattleModeCard: () => <div data-testid="battle-mode-card" />,
}));
vi.mock('@/components/lobby/LobbyReactions', () => ({
  LobbyReactions: () => <div data-testid="lobby-reactions" />,
}));
vi.mock('@/hooks/gameState/store', () => ({ useHostSelectedGameMode: () => 'random' }));
const storeActions = vi.hoisted(() => ({ setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }));
vi.mock('@/hooks/gameState', () => ({
  useGameActions: () => storeActions,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('@/utils/SocketContext', () => ({
  useSocketOptional: () => ({ socket: null }),
  // ProjectorLobby's in-place mode switch resolves the room socket itself.
  getSharedSocketIfExists: () => null,
}));
vi.mock('@/hooks/useLobbyAutoStart', () => ({
  useLobbyAutoStart: () => ({ secondsLeft: null, cancel: vi.fn() }),
}));

const t = (key: string) => key;

const baseProps = {
  gameCode: 'GHYRVS',
  roomLanguage: 'en' as const,
  username: 'Teacher',
  t,
  playersReady: [
    { username: 'Teacher', isHost: true },
    { username: 'Ada', isHost: false },
    { username: 'Bo', isHost: false },
  ],
  timerValue: 20,
  difficulty: 'medium' as const,
  onStartGame: vi.fn(),
  onExitRoom: vi.fn(),
  tournamentCreating: false,
};

function Override(props: { gameCode: string; students: { username: string }[] }) {
  return <div data-testid="edu-lobby" data-code={props.gameCode} data-students={props.students.map((s) => s.username).join(',')} />;
}

describe('edu live surfaces — projector lobby', () => {
  it('given the edu live provider, when a classroom lobby renders, then the edu lobby replaces the projector lobby with the same roster', () => {
    render(
      <EduLiveSurfacesProvider value={{ ProjectorLobby: Override as never }}>
        <TvLobbyView {...baseProps} isClassroomMode classroomGameMode="classic" />
      </EduLiveSurfacesProvider>,
    );
    expect(screen.queryByTestId('projector-lobby')).not.toBeInTheDocument();
    expect(screen.getByTestId('edu-lobby')).toHaveAttribute('data-students', 'Ada,Bo');
    expect(screen.getByTestId('edu-lobby')).toHaveAttribute('data-code', 'GHYRVS');
  });

  it('given no provider, when a classroom lobby renders, then /multiplayer keeps its projector lobby', () => {
    render(<TvLobbyView {...baseProps} isClassroomMode classroomGameMode="classic" />);
    expect(screen.getByTestId('projector-lobby')).toBeInTheDocument();
  });
});
