import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

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
          gameCode="BOSS01"
          language="en"
          baseUrl="http://localhost:3000"
          students={[{ username: 'Ada' }]}
          readyUsernames={[]}
          t={t}
          onStartGame={onStartGame}
          startLabelKey="hostView.startQuiz"
          classroomGameMode="vocab-quiz"
        />
      </LanguageProvider>
    </AuthProvider>
  );
  return onStartGame;
}

const emitFromServer = (event: string, data: unknown) =>
  act(() => listeners.get(event)?.forEach((fn) => fn(data)));

describe('ProjectorLobby — quiz start the lesson cannot satisfy', () => {
  beforeEach(() => {
    sessionStorage.clear();
    listeners.clear();
    vi.clearAllMocks();
  });

  it('Given a boss lobby on a list with no quizzable words, Then Start is disabled and the reason is on screen', () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ gameMode: 'vocab-quiz', vocabQuizVariant: 'boss', quizPlayable: false }));
    const onStart = renderLobby();

    expect(screen.getByTestId('projector-start')).toBeDisabled();
    expect(screen.getByTestId('quiz-blocked-reason')).toHaveTextContent('eg2Modes.noQuizWords');
    fireEvent.click(screen.getByTestId('projector-start'));
    expect(onStart).not.toHaveBeenCalled();
  });

  it('When the teacher taps Play Classic instead, Then the room is switched through the server, not started', () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ gameMode: 'vocab-quiz', vocabQuizVariant: 'boss', quizPlayable: false }));
    const onStart = renderLobby();

    fireEvent.click(screen.getByTestId('quiz-blocked-play-classic'));

    expect(fakeSocket.emit).toHaveBeenCalledWith('updateClassroomGameMode', { gameCode: 'BOSS01', gameMode: 'classic' });
    expect(onStart).not.toHaveBeenCalled();
  });

  it('When the server confirms Classic, Then the block lifts and Start is live again', () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ gameMode: 'vocab-quiz', quizPlayable: false }));
    renderLobby();
    fireEvent.click(screen.getByTestId('quiz-blocked-play-classic'));

    emitFromServer('classroomGameModeChanged', { gameCode: 'BOSS01', gameMode: 'classic' });

    expect(screen.queryByTestId('quiz-blocked-reason')).toBeNull();
    expect(screen.getByTestId('projector-start')).toBeEnabled();
  });

  it('Given the list is quizzable or its quizzability is unknown, Then Start is not blocked', () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ gameMode: 'vocab-quiz', quizPlayable: true }));
    renderLobby();
    expect(screen.getByTestId('projector-start')).toBeEnabled();
    expect(screen.queryByTestId('quiz-blocked-reason')).toBeNull();
  });

  it('Given the server refuses the quiz start, Then the teacher is told in a toast and the inline reason appears', () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ gameMode: 'vocab-quiz', vocabQuizVariant: 'boss' }));
    renderLobby();

    emitFromServer(VOCAB_QUIZ_EVENTS.startRefused, { gameCode: 'BOSS01', reason: 'noQuestions' });

    expect(toastError).toHaveBeenCalledWith('eg2Modes.noQuizWords');
    expect(screen.getByTestId('quiz-blocked-reason')).toBeInTheDocument();
    expect(screen.getByTestId('projector-start')).toBeDisabled();
  });

  it('Given a refusal for another room, Then this lobby ignores it', () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ gameMode: 'vocab-quiz' }));
    renderLobby();

    emitFromServer(VOCAB_QUIZ_EVENTS.startRefused, { gameCode: 'OTHER1', reason: 'noQuestions' });

    expect(toastError).not.toHaveBeenCalled();
    expect(screen.getByTestId('projector-start')).toBeEnabled();
  });

  it('Given a board mode, Then a stale quizPlayable=false never blocks Start', () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ gameMode: 'classic', quizPlayable: false }));
    renderLobby();
    expect(screen.getByTestId('projector-start')).toBeEnabled();
  });
});
