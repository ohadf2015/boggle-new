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

describe('LobbyModeSwitcher — the projector says the chip is a control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('Given the lobby, Then the mode chip carries a visible "change" tag, not just the mode name', () => {
    renderSwitcher();
    expect(screen.getByTestId('lobby-change-mode-tag')).toHaveTextContent('education.modePicker.change');
    expect(screen.getByTestId('lobby-change-mode').contains(screen.getByTestId('lobby-change-mode-tag'))).toBe(true);
  });
});
