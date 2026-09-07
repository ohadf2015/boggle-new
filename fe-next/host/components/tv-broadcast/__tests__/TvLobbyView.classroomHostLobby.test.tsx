'use client';

/**
 * Classroom host lobby — the teacher's projector surface.
 *
 * Two faults found by a live critic run (critic-livequiz-r4), both in this file:
 *
 *  1. The lobby rendered the arcade "BATTLE MODE" picker (Classic / Word Hunt /
 *     Wheel Rush / Blast — with no Vocab Quiz in it) and a "START BATTLE!" CTA,
 *     directly under a settings panel that already said the mode was Vocab Quiz.
 *     In a classroom room the mode is fixed at setup, so the picker is a lie and
 *     the arcade copy is the wrong register for a teacher.
 *
 *  2. `PlayerRoster` was mounted WITHOUT `readyUsernames`, so its ready chip was
 *     structurally stuck at "0/N" — the denominator came from the roster, the
 *     numerator from a prop that was never passed. Both students tapped READY
 *     UP and the teacher's screen never moved. HostPreGameView (the phone lobby)
 *     did pass it; only the TV lobby, which is the one classroom hosts land on,
 *     did not.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvLobbyView from '../TvLobbyView';

vi.mock('framer-motion', () => ({
  m: { h1: 'h1', div: 'div', button: 'button' },
}));

vi.mock('lucide-react', () => ({
  Timer: () => null,
  Zap: () => null,
  Monitor: () => null,
  Swords: () => null,
  Play: () => null,
}));

vi.mock('../TvJoinBar', () => ({
  default: () => <div data-testid="tv-join-bar" />,
}));

// Echo the prop under test — the bug was a missing prop, so the assertion is on
// what the roster is handed, not on how the roster renders it (PlayerRoster's own
// ready rendering is covered by PlayerRoster.ready.test.tsx).
vi.mock('../../pre-game/PlayerRoster', () => ({
  PlayerRoster: ({ readyUsernames = [] }: { readyUsernames?: string[] }) => (
    <div data-testid="player-roster" data-ready={readyUsernames.join(',')} />
  ),
}));

vi.mock('../../pre-game/BattleModeCard', () => ({
  BattleModeCard: () => <div data-testid="battle-mode-card" />,
}));

vi.mock('@/components/lobby/LobbyReactions', () => ({
  LobbyReactions: () => <div data-testid="lobby-reactions" />,
}));

vi.mock('@/hooks/gameState/store', () => ({
  useHostSelectedGameMode: () => 'random',
}));

vi.mock('@/hooks/gameState', () => ({
  useGameActions: () => ({ setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: () => ({ socket: null }) }));
vi.mock('@/hooks/useLobbyAutoStart', () => ({
  useLobbyAutoStart: () => ({ secondsLeft: null, cancel: vi.fn() }),
}));

const t = (key: string) => key;

const students = [
  { username: 'Ada', isHost: false },
  { username: 'Bo', isHost: false },
];

const baseProps = {
  gameCode: 'GHYRVS',
  roomLanguage: 'en' as const,
  username: 'Teacher',
  t,
  playersReady: students,
  timerValue: 20,
  difficulty: 'medium' as const,
  onStartGame: vi.fn(),
  onExitRoom: vi.fn(),
  tournamentCreating: false,
};

describe('TvLobbyView — ready count reaches the host', () => {
  it('hands the roster the server ready list so the chip can leave 0/N', () => {
    render(<TvLobbyView {...baseProps} readyUsernames={['Ada', 'Bo']} />);

    expect(screen.getByTestId('player-roster')).toHaveAttribute('data-ready', 'Ada,Bo');
  });

  it('passes an empty list through unchanged when nobody is ready yet', () => {
    render(<TvLobbyView {...baseProps} readyUsernames={[]} />);

    expect(screen.getByTestId('player-roster')).toHaveAttribute('data-ready', '');
  });
});

describe('TvLobbyView — classroom rooms have a fixed mode', () => {
  it('drops the arcade mode picker when the room is a classroom room', () => {
    render(
      <TvLobbyView {...baseProps} readyUsernames={[]} isClassroomMode classroomGameMode="vocab-quiz" />
    );

    expect(screen.queryByTestId('battle-mode-card')).not.toBeInTheDocument();
  });

  it('labels the start control for a quiz, not a battle', () => {
    render(
      <TvLobbyView {...baseProps} readyUsernames={[]} isClassroomMode classroomGameMode="vocab-quiz" />
    );

    expect(screen.getByRole('button', { name: /hostView\.startQuiz/ })).toBeInTheDocument();
    expect(screen.queryByText('hostView.startBattle')).not.toBeInTheDocument();
  });

  it('labels the start control for a board mode classroom game', () => {
    render(
      <TvLobbyView {...baseProps} readyUsernames={[]} isClassroomMode classroomGameMode="word-hunt" />
    );

    expect(screen.getByRole('button', { name: /hostView\.startClassGame/ })).toBeInTheDocument();
  });

  it('leaves the normal multiplayer lobby untouched', () => {
    render(<TvLobbyView {...baseProps} readyUsernames={[]} />);

    expect(screen.getByTestId('battle-mode-card')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hostView\.startBattle/ })).toBeInTheDocument();
  });
});
