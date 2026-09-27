/**
 * The adult who never touched a tile must not win the round.
 *
 * Reproduced live on 2026-09-11 in room DQRV92: a classroom host is forced
 * into broadcast mode but is still a socket in the room, so the server ranked
 * the teacher's zero first and the wall read "WE HAVE A WINNER! Mr. Gauntlet B
 * — 0" above three children's plinths, while a student's phone told them they
 * came 2nd of 4 in a class of three.
 *
 * Both surfaces read the SAME helper (`lib/education/roundEndPodium`), so this
 * file asserts them together — a fix that lands on one screen and not the
 * other is the exact shape of Pitfall Class 3.
 */

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
  fireVictoryConfetti: vi.fn(),
  cleanupConfetti: vi.fn(),
}));

vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: vi.fn(() => null),
  ROUND_WIN_SOUND: '/sounds/education-round-win.mp3',
  CLASS_SWEEP_SOUND: '/sounds/education-class-sweep.mp3',
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    language: 'en',
  }),
}));

import { ClassroomTvResults } from '../ClassroomTvResults';
import { ClassroomResultsCard } from '@/components/education/ClassroomResultsCard';
import type { ClassroomSummary } from '@/shared/types/classroom';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const TEACHER = 'Mr. Gauntlet B';

/**
 * Reduced motion, so every assertion here reads the RESTING frame — the one a
 * screenshot, a rematch remount and a calm-motion classroom all start on. Who
 * is on the podium is not a question about animation.
 */
function calmMotion() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: /prefers-reduced-motion/.test(query),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

const summary = (over: Partial<ClassroomSummary> = {}): ClassroomSummary => ({
  teacherName: TEACHER,
  lessonNames: ['Common English'],
  lessonIds: ['lesson-1'],
  totalWords: 4,
  classFoundCount: 2,
  coverage: [
    { word: 'photon', foundBy: ['Noa'] },
    { word: 'atom', foundBy: ['Dan'] },
    { word: 'quark', foundBy: [] },
    { word: 'boson', foundBy: [] },
  ],
  missedWords: ['quark', 'boson'],
  masteryByPlayer: {
    [TEACHER]: { found: 0, total: 4 },
    Noa: { found: 1, total: 4 },
    Dan: { found: 1, total: 4 },
  },
  // Exactly what the server sends when the class is off to a slow start: the
  // host's zero sorted to the top.
  podium: [
    { username: TEACHER, score: 0, rank: 1, wordsFound: 0, totalWords: 4 },
    { username: 'Noa', score: 40, rank: 2, wordsFound: 1, totalWords: 4 },
    { username: 'Dan', score: 20, rank: 3, wordsFound: 1, totalWords: 4 },
  ],
  ...over,
});

describe('the projector', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    calmMotion();
  });
  afterEach(cleanup);

  it('keeps the teacher off the plinths', () => {
    render(<ClassroomTvResults summary={summary()} t={t} />);
    expect(screen.queryByText(TEACHER)).toBeNull();
  });

  it('crowns the top student instead', () => {
    render(<ClassroomTvResults summary={summary()} t={t} />);
    const first = screen.getByTestId('podium-place-1');
    expect(first.textContent).toContain('Noa');
  });

  it('gives the winner spotlight the student, not the host', () => {
    render(<ClassroomTvResults summary={summary()} t={t} />);
    expect(screen.getByTestId('winner-spotlight').textContent).toContain('Noa');
  });

  it('still shows a solo teacher rather than an empty podium', () => {
    render(
      <ClassroomTvResults
        summary={summary({ podium: [{ username: TEACHER, score: 0, rank: 1 }] })}
        t={t}
      />
    );
    expect(screen.getByTestId('podium-place-1').textContent).toContain(TEACHER);
  });
});

describe('the student phone', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    calmMotion();
  });
  afterEach(cleanup);

  const standings = [
    { username: TEACHER, score: 0 },
    { username: 'Noa', score: 40 },
    { username: 'Dan', score: 20 },
  ];

  it('counts the class without the teacher — "1 of 2", never "2 of 3"', () => {
    render(
      <ClassroomResultsCard
        summary={summary()}
        username="Noa"
        isTeacher={false}
        standings={standings}
      />
    );
    const outcome = screen.getByTestId('student-round-outcome');
    expect(outcome.getAttribute('data-rank')).toBe('1');
    expect(outcome.textContent).toContain('"total":2');
  });

  it('keeps the teacher off the card podium too', () => {
    render(
      <ClassroomResultsCard
        summary={summary()}
        username="Noa"
        isTeacher={false}
        standings={standings}
      />
    );
    expect(screen.getByTestId('podium-place-1').textContent).toContain('Noa');
  });
});
