import { render, screen, cleanup } from '@testing-library/react';
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
const words = ['photon', 'atom', 'quark', 'boson'];

function summary(foundBy: Record<string, string[]>, missedWords: string[] = []): ClassroomSummary {
  return {
    teacherName: 'Ms. Cohen',
    lessonNames: ['Unit 3'],
    lessonIds: ['lesson-1'],
    totalWords: 4,
    classFoundCount: words.filter((w) => foundBy[w]?.length).length,
    coverage: words.map((word) => ({ word, foundBy: foundBy[word] ?? [] })),
    missedWords,
    masteryByPlayer: { Maya: { found: 2, total: 4 }, Noa: { found: 2, total: 4 }, Eli: { found: 2, total: 4 } },
  } as unknown as ClassroomSummary;
}

describe('ClassroomTvResults — the fallback wall says what the shared reteach rule decided', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });
  afterEach(cleanup);

  it('given every word found by most of the class, then the wall says all found once and offers no whole-lesson line', () => {
    const all = Object.fromEntries(words.map((w) => [w, ['Maya', 'Noa']]));
    render(<ClassroomTvResults summary={summary(all)} gameCode="ABC123" onRematch={vi.fn()} t={t} revealSettled />);
    expect(screen.getAllByText('education.results.allFound')).toHaveLength(1);
    expect(screen.queryByText('education.results.wholeLessonAgain')).not.toBeInTheDocument();
  });

  it('given a word only one of three found, then the wall offers the replay and never claims all found', () => {
    const most = Object.fromEntries(words.map((w) => [w, ['Maya', 'Noa', 'Eli']]));
    render(<ClassroomTvResults summary={summary({ ...most, boson: ['Eli'] })} gameCode="ABC123" onRematch={vi.fn()} t={t} revealSettled />);
    expect(screen.getByTestId('play-reteach-round')).toBeInTheDocument();
    expect(screen.queryByText('education.results.allFound')).not.toBeInTheDocument();
  });

  it('given every word missed by most of the class, then the wall says to play the whole lesson again and offers no replay', () => {
    render(<ClassroomTvResults summary={summary({ photon: ['Maya'] }, ['atom', 'quark', 'boson'])} gameCode="ABC123" onRematch={vi.fn()} t={t} revealSettled />);
    expect(screen.getAllByText('education.results.wholeLessonAgain')).toHaveLength(1);
    expect(screen.queryByTestId('play-reteach-round')).not.toBeInTheDocument();
    expect(screen.queryByText('education.results.allFound')).not.toBeInTheDocument();
  });
});
