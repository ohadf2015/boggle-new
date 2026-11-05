import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthProvider';
import { CROSSWORD_CLASSROOM_EVENTS } from '@/shared/types/crosswordClassroom';

const { fakeSocket, listeners, toastError } = vi.hoisted(() => {
  const listeners = new Map<string, Set<(d?: unknown) => void>>();
  return {
    listeners,
    toastError: vi.fn(),
    fakeSocket: {
      emit: vi.fn(),
      on: (e: string, fn: (d?: unknown) => void) => {
        if (!listeners.has(e)) listeners.set(e, new Set());
        listeners.get(e)!.add(fn);
      },
      off: (e: string, fn: (d?: unknown) => void) => listeners.get(e)?.delete(fn),
    },
  };
});

vi.mock('@/utils/SocketContext', () => ({ getSharedSocketIfExists: () => fakeSocket }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: toastError, success: vi.fn() }) }));

import { ProjectorLobby } from '../ProjectorLobby';

const t = (key: string) => key;

function renderLobby(onStartGame = vi.fn()) {
  render(
    <AuthProvider>
      <LanguageProvider>
        <ProjectorLobby
          gameCode="CW0001"
          language="en"
          baseUrl="http://localhost:3000"
          students={[{ username: 'Ada' }]}
          readyUsernames={[]}
          t={t}
          onStartGame={onStartGame}
          startLabelKey="hostView.startGame"
          classroomGameMode="crossword"
        />
      </LanguageProvider>
    </AuthProvider>
  );
  return onStartGame;
}

const emitFromServer = (event: string, data: unknown) =>
  act(() => listeners.get(event)?.forEach((fn) => fn(data)));

describe('ProjectorLobby — a crossword the lesson is too small for', () => {
  beforeEach(() => {
    sessionStorage.clear();
    listeners.clear();
    vi.clearAllMocks();
  });

  it('Given the server refuses the grid, Then Start steps aside, the teacher reads why and is toasted once', () => {
    renderLobby();
    expect(screen.getByTestId('projector-start')).not.toBeDisabled();

    emitFromServer(CROSSWORD_CLASSROOM_EVENTS.startRefused, { gameCode: 'CW0001', reason: 'tooFewWords', usableWords: 2 });

    expect(screen.getByTestId('projector-start')).toBeDisabled();
    expect(screen.getByTestId('quiz-blocked-reason')).toHaveTextContent('eduCrossword.tooFewWords');
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith('eduCrossword.tooFewWords');
  });

  it('ignores a refusal for another room', () => {
    renderLobby();
    emitFromServer(CROSSWORD_CLASSROOM_EVENTS.startRefused, { gameCode: 'OTHER1', reason: 'tooFewWords', usableWords: 0 });
    expect(screen.queryByTestId('quiz-blocked-reason')).not.toBeInTheDocument();
  });

  it('When the teacher taps Play Classic instead, Then the room is switched through the server', () => {
    renderLobby();
    emitFromServer(CROSSWORD_CLASSROOM_EVENTS.startRefused, { gameCode: 'CW0001', reason: 'tooFewWords', usableWords: 1 });
    fireEvent.click(screen.getByTestId('quiz-blocked-play-classic'));
    expect(fakeSocket.emit).toHaveBeenCalledWith('updateClassroomGameMode', expect.objectContaining({ gameCode: 'CW0001', gameMode: 'classic' }));
  });
});
