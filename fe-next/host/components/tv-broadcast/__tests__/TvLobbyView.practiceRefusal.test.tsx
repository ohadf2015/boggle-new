import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const handlers = new Map<string, (p: unknown) => void>();
const socket = { on: vi.fn((e: string, h: (p: unknown) => void) => { handlers.set(e, h); }), off: vi.fn((e: string) => { handlers.delete(e); }) };

vi.mock('@/lib/education/rehearsalTelemetry', () => ({ trackEduRehearsalStarted: vi.fn() }));
vi.mock('@/components/education/projector/ProjectorLobby', () => ({
  default: (p: { onStartPracticeRound?: () => void; practiceRoundPending?: boolean; practiceRoundFailed?: boolean; practiceRoundFailedKey?: string }) => (
    <div>
      <button type="button" data-testid="practice" onClick={p.onStartPracticeRound}>practice</button>
      <span data-testid="pending">{String(p.practiceRoundPending)}</span>
      {p.practiceRoundFailed ? <span data-testid="failed">{p.practiceRoundFailedKey}</span> : null}
    </div>
  ),
}));
vi.mock('@/components/education/live/eduLiveSurfaces', () => ({ useEduLiveSurfaces: () => ({}) }));
vi.mock('@/components/lobby/LobbyReactions', () => ({ LobbyReactions: () => null }));
vi.mock('@/hooks/gameState/store', () => ({ useHostSelectedGameMode: () => 'classic' }));
vi.mock('@/hooks/gameState', () => ({ useGameActions: () => ({ setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: () => ({ socket }), getSharedSocketIfExists: () => null }));
vi.mock('@/hooks/useLobbyAutoStart', () => ({ useLobbyAutoStart: () => ({ secondsLeft: null, cancel: vi.fn() }) }));
vi.mock('../../../hooks/useClassroomModeSeed', () => ({ useClassroomModeSeed: () => undefined }));

import TvLobbyView from '../TvLobbyView';

describe('TvLobbyView — practice bots refused', () => {
  it('Given a pending practice request, When the server refuses it as not_host, Then the lobby stops waiting and says why', () => {
    render(
      <TvLobbyView
        gameCode="AB12CD" roomLanguage="en" username="Teacher" t={(k: string) => k} timerValue={120} difficulty="medium"
        onStartGame={vi.fn()} onExitRoom={vi.fn()} tournamentCreating={false} isClassroomMode classroomGameMode="classic"
        playersReady={[{ username: 'Teacher', isHost: true }]} onStartSoloDemoWithBots={() => vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('practice'));
    expect(screen.getByTestId('pending')).toHaveTextContent('true');
    act(() => handlers.get('autoFillRefused')?.({ reason: 'not_host' }));
    expect(screen.getByTestId('pending')).toHaveTextContent('false');
    expect(screen.getByTestId('failed')).toHaveTextContent('tvLobby.practiceRefused.not_host');
  });

  it('Given practice bots still seated from an earlier run, When the teacher peeks again, Then the round starts without waiting for new seats', () => {
    const begin = vi.fn();
    render(
      <TvLobbyView
        gameCode="AB12CD" roomLanguage="en" username="Teacher" t={(k: string) => k} timerValue={120} difficulty="medium"
        onStartGame={vi.fn()} onExitRoom={vi.fn()} tournamentCreating={false} isClassroomMode classroomGameMode="classic"
        playersReady={[{ username: 'Teacher', isHost: true }, { username: 'Bot Ada', isBot: true }, { username: 'Bot Lin', isBot: true }]}
        onStartSoloDemoWithBots={() => begin}
      />,
    );
    fireEvent.click(screen.getByTestId('practice'));
    act(() => handlers.get('autoFillComplete')?.({ botsAdded: 0, alreadySeated: true }));
    expect(begin).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('pending')).toHaveTextContent('false');
  });

  it('Given real students on the roster, When an already-seated answer arrives anyway, Then nothing starts and the lobby says students are here', () => {
    const begin = vi.fn();
    render(
      <TvLobbyView
        gameCode="AB12CD" roomLanguage="en" username="Teacher" t={(k: string) => k} timerValue={120} difficulty="medium"
        onStartGame={vi.fn()} onExitRoom={vi.fn()} tournamentCreating={false} isClassroomMode classroomGameMode="classic"
        playersReady={[{ username: 'Teacher', isHost: true }, { username: 'Bot Ada', isBot: true }, { username: 'Ana' }]}
        onStartSoloDemoWithBots={() => begin}
      />,
    );
    fireEvent.click(screen.getByTestId('practice'));
    act(() => handlers.get('autoFillComplete')?.({ botsAdded: 0, alreadySeated: true }));
    expect(begin).not.toHaveBeenCalled();
    expect(screen.getByTestId('failed')).toHaveTextContent('tvLobby.practiceRefused.students_present');
  });
});
