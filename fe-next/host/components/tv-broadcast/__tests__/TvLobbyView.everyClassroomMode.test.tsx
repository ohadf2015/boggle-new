import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvLobbyView from '../TvLobbyView';
import { CLASSROOM_GAME_MODES } from '@/shared/types/vocabQuiz';

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
      data-mode={(props as { classroomGameMode?: string }).classroomGameMode}
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

describe.each([...CLASSROOM_GAME_MODES])('%s: the teacher lobby is the one projector lobby', (mode) => {
  it('mounts the projector lobby with the mode, never the arcade join bar, roster or settings', () => {
    render(<TvLobbyView {...baseProps} isClassroomMode classroomGameMode={mode} />);
    expect(screen.getByTestId('projector-lobby')).toHaveAttribute('data-mode', mode);
    expect(screen.getByTestId('projector-lobby')).toHaveAttribute('data-students', 'Ada,Bo');
    expect(screen.queryByTestId('tv-join-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('player-roster')).not.toBeInTheDocument();
    expect(screen.queryByTestId('battle-mode-card')).not.toBeInTheDocument();
  });
});
