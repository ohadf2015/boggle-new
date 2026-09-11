/**
 * Changing the game from inside a live lobby — same room, same code.
 *
 * The gap a blind critic reproduced: round 1's picker only existed BEFORE the
 * room. Once GO LIVE had fired, a teacher who read the room and wanted a quiz
 * instead had one move — exit, which ends the room for every student already
 * in it, and come back with a NEW six-character code the class has to retype.
 *
 * The switch has to move three things at once, and the third is the one that
 * makes Classic→Vocab Quiz work at all:
 *   1. `lessonGameData` in the teacher's sessionStorage — what the host shell
 *      and the projector read to describe the room.
 *   2. the game store's `hostSelectedGameMode` — what the host's `startGame`
 *      payload carries, i.e. which BOARD mode actually starts.
 *   3. the Redis classroom record, over `updateClassroomGameMode` — what the
 *      SERVER reads to decide quiz-vs-board.
 * Moving only 1 and 2 would switch three modes and silently fail the fourth
 * (recurring pitfall class 3).
 *
 * And it is pessimistic on purpose: nothing on screen changes until the server
 * says it applied (pitfall class 1 — no optimistic state a late answer flips).
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const { mockToastError, mockToastSuccess } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: mockToastError, success: mockToastSuccess },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: unknown) =>
      params && typeof params === 'object' ? `${key}|${JSON.stringify(params)}` : key,
    language: 'en',
  }),
}));

const { setGameMode, setHostSelectedGameMode } = vi.hoisted(() => ({
  setGameMode: vi.fn(),
  setHostSelectedGameMode: vi.fn(),
}));
vi.mock('@/hooks/gameState', () => ({
  useGameActions: () => ({ setGameMode, setHostSelectedGameMode }),
}));

import { LobbyModeSwitcher } from '../lobby/LobbyModeSwitcher';

const handlers: Record<string, (data?: unknown) => void> = {};
const emit = vi.fn();
const socket = {
  emit,
  on: vi.fn((e: string, fn: (data?: unknown) => void) => {
    handlers[e] = fn;
  }),
  off: vi.fn((e: string) => {
    delete handlers[e];
  }),
} as never;

const CODE = 'JATS5Z';

function renderSwitcher(currentMode = 'classic') {
  return render(
    <LobbyModeSwitcher gameCode={CODE} currentMode={currentMode as never} socket={socket} />
  );
}

function ack(gameMode: string, gameCode = CODE) {
  act(() => handlers['classroomGameModeChanged']?.({ gameCode, gameMode }));
}

describe('LobbyModeSwitcher — the room keeps its code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(handlers)) delete handlers[k];
    sessionStorage.clear();
    sessionStorage.setItem(
      'lessonGameData',
      JSON.stringify({
        lessonId: 'l1',
        lessonName: 'Cell Biology',
        vocabularyWords: ['osmosis'],
        language: 'en',
        gameMode: 'classic',
      })
    );
  });

  it('names the live game and offers exactly one way to change it', async () => {
    renderSwitcher();
    expect(screen.getByTestId('lobby-mode-switcher')).toHaveTextContent(
      'teacher.classroom.gameModes.classic'
    );
    expect(screen.getAllByTestId('lobby-change-mode')).toHaveLength(1);
    // Shut on arrival: the projector is not a settings screen.
    expect(screen.queryByTestId('mode-picker-track')).not.toBeInTheDocument();
  });

  it('asks the SERVER to move the existing room, never to make a new one', async () => {
    renderSwitcher();
    fireEvent.click(screen.getByTestId('lobby-change-mode'));
    fireEvent.click(screen.getByTestId('mode-tile-vocab-quiz'));

    expect(emit).toHaveBeenCalledWith('updateClassroomGameMode', {
      gameCode: CODE,
      gameMode: 'vocab-quiz',
    });
    expect(emit.mock.calls.map((c) => c[0])).not.toContain('createClassroomGame');
  });

  it('writes the mode the host shell and the projector read, once the server agrees', async () => {
    renderSwitcher();
    fireEvent.click(screen.getByTestId('lobby-change-mode'));
    fireEvent.click(screen.getByTestId('mode-tile-vocab-quiz'));

    // Nothing has moved yet — the server has not answered.
    expect(JSON.parse(sessionStorage.getItem('lessonGameData')!).gameMode).toBe('classic');

    ack('vocab-quiz');

    await waitFor(() =>
      expect(JSON.parse(sessionStorage.getItem('lessonGameData')!).gameMode).toBe('vocab-quiz')
    );
    expect(screen.getByTestId('lobby-mode-switcher')).toHaveTextContent(
      'teacher.classroom.gameModes.vocabQuiz'
    );
  });

  /** The board modes start from the host's own payload, so the store must move. */
  it('moves the game store for a board mode so the round actually starts as one', async () => {
    renderSwitcher('vocab-quiz');
    fireEvent.click(screen.getByTestId('lobby-change-mode'));
    fireEvent.click(screen.getByTestId('mode-tile-blast'));
    ack('blast');

    await waitFor(() => expect(setHostSelectedGameMode).toHaveBeenCalledWith('blast'));
    expect(setGameMode).toHaveBeenCalledWith('blast');
  });

  /**
   * `vocab-quiz` is deliberately not a member of the board `GameMode` union —
   * writing it into the board store would put a mode the engine cannot roll
   * into random mode rolls and every mode branch. The server owns that switch.
   */
  it('never writes the quiz into the board-mode store', async () => {
    renderSwitcher();
    fireEvent.click(screen.getByTestId('lobby-change-mode'));
    fireEvent.click(screen.getByTestId('mode-tile-vocab-quiz'));
    ack('vocab-quiz');

    await waitFor(() => expect(screen.getByTestId('lobby-mode-switcher')).toBeInTheDocument());
    expect(setHostSelectedGameMode).not.toHaveBeenCalledWith('vocab-quiz');
    expect(setGameMode).not.toHaveBeenCalledWith('vocab-quiz');
  });

  it('closes the fold and says so when the switch lands', async () => {
    renderSwitcher();
    fireEvent.click(screen.getByTestId('lobby-change-mode'));
    fireEvent.click(screen.getByTestId('mode-tile-blast'));
    ack('blast');

    await waitFor(() => expect(screen.queryByTestId('mode-picker-track')).not.toBeInTheDocument());
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  /** A refusal is never a silent no-op (pitfall class 4). */
  it('tells the teacher when the server refuses, and keeps the old game', async () => {
    renderSwitcher();
    fireEvent.click(screen.getByTestId('lobby-change-mode'));
    fireEvent.click(screen.getByTestId('mode-tile-blast'));

    act(() => handlers['classroomGameError']?.({ error: 'education.modePicker.switchMidRound' }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(screen.getByTestId('lobby-mode-switcher')).toHaveTextContent(
      'teacher.classroom.gameModes.classic'
    );
    expect(JSON.parse(sessionStorage.getItem('lessonGameData')!).gameMode).toBe('classic');
  });

  /** An ack for some other room must not repaint this one. */
  it('ignores an acknowledgement for a different room', async () => {
    renderSwitcher();
    fireEvent.click(screen.getByTestId('lobby-change-mode'));
    fireEvent.click(screen.getByTestId('mode-tile-blast'));
    ack('wheel-rush', 'OTHER1');

    await waitFor(() => expect(screen.getByTestId('lobby-mode-switcher')).toBeInTheDocument());
    expect(screen.getByTestId('lobby-mode-switcher')).toHaveTextContent(
      'teacher.classroom.gameModes.classic'
    );
  });
});
