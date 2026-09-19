/**
 * A finished Vocab Quiz must own the student's phone.
 *
 * The shell hides the classroom chrome during play and brings it back with
 * the results (`hideClassroomChrome`). A quiz never sets the store's
 * `gameActive`, so `classroomPanelExpanded({ gameActive })` read "lobby" at the
 * final whistle and re-opened the full Game Settings card — 300px of a 390x844
 * phone — above the student's podium, pushing the "wait for the next game"
 * action below the fold (gauntlet r2 capture, 2026-09-18).
 *
 * Once the room has shown quiz traffic, the panel stays collapsed: the quiz
 * surface carries its own header, and the settings were for a game that is
 * already over.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { ClassroomModeBanner } from '../ClassroomModeBanner';
import * as LanguageContext from '@/contexts/LanguageContext';
import { SocketContext, type SocketContextValue } from '@/utils/SocketContext';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

const liveQuiz = {
  gameCode: 'JATS5Z',
  classroomId: 'c1',
  classroomName: 'ELA Period 3',
  lessonNames: ['Week 3 Vocabulary'],
  gameMode: 'vocab-quiz' as const,
  settings: {
    timerMinutes: null,
    boardSize: null,
    allowLateJoin: true,
    vocabQuizQuestionCount: 8,
    vocabQuizSeconds: 25,
  },
};

type Handler = (...args: unknown[]) => void;

function fakeSocket() {
  const handlers = new Map<string, Set<Handler>>();
  const socket = {
    on: vi.fn((event: string, cb: Handler) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(cb);
      return socket;
    }),
    off: vi.fn((event: string, cb: Handler) => {
      handlers.get(event)?.delete(cb);
      return socket;
    }),
    emit: vi.fn(),
  };
  const fire = (event: string, payload?: unknown) =>
    handlers.get(event)?.forEach((cb) => cb(payload));
  return { socket: socket as unknown as Socket, fire };
}

function renderWithSocket(socket: Socket | null) {
  vi.spyOn(LanguageContext, 'useLanguage').mockReturnValue({
    language: 'en',
    t: (key: string) => key,
    dir: 'ltr',
  } as unknown as ReturnType<typeof LanguageContext.useLanguage>);
  const ctx = { socket } as unknown as SocketContextValue;
  return render(
    <SocketContext.Provider value={ctx}>
      <ClassroomModeBanner lessonData={null} gameCode="JATS5Z" expanded isHost={false} liveGame={liveQuiz} />
    </SocketContext.Provider>
  );
}

describe('ClassroomModeBanner — a finished quiz owns the phone', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the settings card in the lobby, before any quiz traffic', () => {
    const { socket } = fakeSocket();
    renderWithSocket(socket);
    expect(screen.getByText('education.classroomGame.gameSettings')).toBeTruthy();
  });

  it('collapses the settings card once the quiz has ended', () => {
    const { socket, fire } = fakeSocket();
    renderWithSocket(socket);
    act(() => fire(VOCAB_QUIZ_EVENTS.ended, { gameCode: 'JATS5Z' }));
    expect(screen.queryByText('education.classroomGame.gameSettings')).toBeNull();
    // The slim strip (class + lesson) is kept — it is one line, not a card.
    expect(screen.getByText('ELA Period 3')).toBeTruthy();
  });

  it('re-opens it when a board round takes the room back', () => {
    const { socket, fire } = fakeSocket();
    renderWithSocket(socket);
    act(() => fire(VOCAB_QUIZ_EVENTS.state, {}));
    expect(screen.queryByText('education.classroomGame.gameSettings')).toBeNull();
    act(() => fire('startGame', {}));
    expect(screen.getByText('education.classroomGame.gameSettings')).toBeTruthy();
  });

  it('renders without a socket provider (tests, SSR) exactly as before', () => {
    renderWithSocket(null);
    expect(screen.getByText('education.classroomGame.gameSettings')).toBeTruthy();
  });
});
