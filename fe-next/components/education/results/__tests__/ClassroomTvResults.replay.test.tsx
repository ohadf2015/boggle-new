import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn(), fireVictoryConfetti: vi.fn(), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: vi.fn(() => null),
  ROUND_WIN_SOUND: '/sounds/education-round-win.mp3',
  CLASS_SWEEP_SOUND: '/sounds/education-class-sweep.mp3',
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: true }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

const { socket } = vi.hoisted(() => {
  const handlers: Record<string, Array<(data: unknown) => void>> = {};
  return {
    socket: {
      handlers,
      emit: vi.fn(),
      on: vi.fn((event: string, fn: (data: unknown) => void) => {
        (handlers[event] ??= []).push(fn);
      }),
      off: vi.fn((event: string, fn: (data: unknown) => void) => {
        handlers[event] = (handlers[event] ?? []).filter((h) => h !== fn);
      }),
      fire: (event: string, data: unknown) => (handlers[event] ?? []).forEach((h) => h(data)),
    },
  };
});
vi.mock('@/utils/SocketContext', () => ({ getSharedSocketIfExists: () => socket }));

import { ClassroomTvResults } from '../ClassroomTvResults';
import type { ClassroomSummary } from '@/shared/types/classroom';

const t = (key: string) => key;

const summary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Unit 3'],
  lessonIds: ['lesson-1'],
  totalWords: 4,
  classFoundCount: 2,
  coverage: [
    { word: 'photon', foundBy: ['Maya'] },
    { word: 'atom', foundBy: ['Noa'] },
    { word: 'quark', foundBy: [] },
    { word: 'boson', foundBy: [] },
  ],
  missedWords: ['quark', 'boson'],
  masteryByPlayer: { Maya: { found: 2, total: 4 }, Noa: { found: 1, total: 4 } },
} as unknown as ClassroomSummary;

describe('ClassroomTvResults — the fallback wall replays through the server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.sessionStorage.setItem('lessonGameData', JSON.stringify({ lessonId: 'lesson-1', lessonName: 'Unit 3', vocabularyWords: ['photon', 'atom', 'quark', 'boson'] }));
  });
  afterEach(cleanup);

  it('given missed words, when the teacher taps replay, then the room is narrowed on the server and the round waits for its answer', () => {
    const onRematch = vi.fn();
    render(<ClassroomTvResults summary={summary} gameCode="ABC123" onRematch={onRematch} t={t} />);
    fireEvent.click(screen.getByTestId('play-reteach-round'));

    expect(socket.emit).toHaveBeenCalledWith('classroomReteachWords', { gameCode: 'ABC123', words: ['quark', 'boson'] });
    expect(onRematch).not.toHaveBeenCalled();
    expect(JSON.parse(window.sessionStorage.getItem('lessonGameData')!).vocabularyWords).toHaveLength(4);

    act(() => socket.fire('classroomReteachApplied', { gameCode: 'ABC123', words: ['quark', 'boson'] }));
    expect(onRematch).toHaveBeenCalledTimes(1);
  });

  it('given the server refuses, when it answers, then the wall says so and no round starts', () => {
    const onRematch = vi.fn();
    render(<ClassroomTvResults summary={summary} gameCode="ABC123" onRematch={onRematch} t={t} />);
    fireEvent.click(screen.getByTestId('play-reteach-round'));
    act(() => socket.fire('classroomReteachRefused', { gameCode: 'ABC123' }));
    expect(screen.getByTestId('edu-replay-failed')).toBeInTheDocument();
    expect(onRematch).not.toHaveBeenCalled();
  });

  it('given no way to start a round, when shown, then the replay button is not offered', () => {
    render(<ClassroomTvResults summary={summary} gameCode="ABC123" t={t} />);
    expect(screen.queryByTestId('play-reteach-round')).not.toBeInTheDocument();
  });
});
