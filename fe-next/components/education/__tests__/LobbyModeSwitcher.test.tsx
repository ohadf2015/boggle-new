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

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}|${JSON.stringify(params)}` : key;

const onModeApplied = vi.fn();

function renderSwitcher(currentMode = 'classic') {
  return render(
    <LobbyModeSwitcher
      gameCode={CODE}
      currentMode={currentMode as never}
      socket={socket}
      t={t}
      onModeApplied={onModeApplied}
    />
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
    expect(screen.getByTestId('lobby-change-mode')).toHaveTextContent(
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
    expect(screen.getByTestId('lobby-change-mode')).toHaveTextContent(
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

    await waitFor(() => expect(screen.getByTestId('lobby-change-mode')).toBeInTheDocument());
    expect(setHostSelectedGameMode).not.toHaveBeenCalledWith('vocab-quiz');
    expect(setGameMode).not.toHaveBeenCalledWith('vocab-quiz');
  });

  it('closes the sheet and says so when the switch lands', async () => {
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
    expect(screen.getByTestId('lobby-change-mode')).toHaveTextContent(
      'teacher.classroom.gameModes.classic'
    );
    expect(JSON.parse(sessionStorage.getItem('lessonGameData')!).gameMode).toBe('classic');
  });

  /**
   * The surrounding surface has its own copies of "what are we playing" — the
   * settings chips and the start-button copy, both fed from `lessonGameData`,
   * which the multiplayer shell reads into React state once at mount. Measured
   * live 2026-09-11: without this the chip said BLAST while the row beside it
   * offered "10 · Questions" and the button still said START QUIZ.
   */
  it('tells the surrounding surface, so the whole lobby re-describes the room', async () => {
    renderSwitcher();
    fireEvent.click(screen.getByTestId('lobby-change-mode'));
    fireEvent.click(screen.getByTestId('mode-tile-blast'));

    expect(onModeApplied).not.toHaveBeenCalled(); // not until the server agrees
    ack('blast');

    await waitFor(() => expect(onModeApplied).toHaveBeenCalledWith('blast'));
  });

  /**
   * The chip lives in the projector footer, whose every other chip is sized in
   * `vw` — correct on a wall, and 10px in a 22px-tall target on a 390px phone,
   * which is the teacher's own screen for half the sessions in this product.
   * Measured live 2026-09-11 at 390x844: 56x22 CSS px, font 10.14px. A control
   * that small is not a control. Phone-first sizing here, `vw` only from `md`.
   */
  it('stays a real tap target on the teacher phone, not a 10px projector chip', () => {
    renderSwitcher();
    const chip = screen.getByTestId('lobby-change-mode');
    expect(chip.className).toContain('min-h-11');
    expect(chip.className).toContain('text-[15px]');
    // Any vw sizing must be behind a breakpoint, never the phone default.
    const bare = chip.className
      .split(/\s+/)
      .filter((c) => /\[[\d.]+vw\]/.test(c) && !/^(sm|md|lg|xl):/.test(c));
    expect(bare).toEqual([]);
  });

  /** An ack for some other room must not repaint this one. */
  it('ignores an acknowledgement for a different room', async () => {
    renderSwitcher();
    fireEvent.click(screen.getByTestId('lobby-change-mode'));
    fireEvent.click(screen.getByTestId('mode-tile-blast'));
    ack('wheel-rush', 'OTHER1');

    await waitFor(() => expect(screen.getByTestId('lobby-change-mode')).toBeInTheDocument());
    expect(screen.getByTestId('lobby-change-mode')).toHaveTextContent(
      'teacher.classroom.gameModes.classic'
    );
  });
});
