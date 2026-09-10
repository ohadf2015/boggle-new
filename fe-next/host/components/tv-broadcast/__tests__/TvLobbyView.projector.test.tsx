/**
 * A classroom room gets ONE join surface.
 *
 * `TvLobbyView` used to mount `TvJoinBar` (code + QR + address) for every room,
 * including classroom rooms — where `ClassroomModeBanner` was already printing
 * its own code + QR + copy button directly above it. Two codes at two sizes on
 * the same projector. The classroom branch now renders the projector lobby and
 * nothing else; the arcade lobby is untouched.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvLobbyView from '../TvLobbyView';

vi.mock('framer-motion', () => ({
  m: { h1: 'h1', div: 'div', button: 'button', span: 'span', p: 'p', li: 'li', ul: 'ul' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => true,
}));

vi.mock('../TvJoinBar', () => ({
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

vi.mock('../../pre-game/PlayerRoster', () => ({
  PlayerRoster: () => <div data-testid="player-roster" />,
}));
vi.mock('../../pre-game/BattleModeCard', () => ({
  BattleModeCard: () => <div data-testid="battle-mode-card" />,
}));
vi.mock('@/components/lobby/LobbyReactions', () => ({
  LobbyReactions: () => <div data-testid="lobby-reactions" />,
}));
vi.mock('@/hooks/gameState/store', () => ({ useHostSelectedGameMode: () => 'random' }));
vi.mock('@/hooks/gameState', () => ({
  useGameActions: () => ({ setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: () => ({ socket: null }) }));
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

describe('TvLobbyView — one lobby surface per room type', () => {
  it('gives a classroom room the projector lobby and no second join bar', () => {
    render(<TvLobbyView {...baseProps} isClassroomMode classroomGameMode="word-hunt" />);

    expect(screen.getByTestId('projector-lobby')).toBeInTheDocument();
    expect(screen.queryByTestId('tv-join-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tv-lobby-settings')).not.toBeInTheDocument();
  });

  it('hands the projector the class only — the host is the screen, not a name on the wall', () => {
    render(
      <TvLobbyView {...baseProps} isClassroomMode classroomGameMode="classic" readyUsernames={['Bo']} />
    );

    expect(screen.getByTestId('projector-lobby')).toHaveAttribute('data-students', 'Ada,Bo');
    expect(screen.getByTestId('projector-lobby')).toHaveAttribute('data-ready', 'Bo');
  });

  it('keeps the classroom start label the teacher already chose', () => {
    render(<TvLobbyView {...baseProps} isClassroomMode classroomGameMode="vocab-quiz" />);
    expect(screen.getByTestId('projector-lobby')).toHaveAttribute('data-label', 'hostView.startQuiz');
  });

  it('leaves the arcade TV lobby exactly as it was', () => {
    render(<TvLobbyView {...baseProps} />);

    expect(screen.getByTestId('tv-join-bar')).toBeInTheDocument();
    expect(screen.queryByTestId('projector-lobby')).not.toBeInTheDocument();
    expect(screen.getByTestId('battle-mode-card')).toBeInTheDocument();
  });
});
