/**
 * What a STUDENT's classroom results card offers next.
 *
 * A classroom room is teacher-paced: the student has nothing to launch, and the
 * teacher's rematch (same room, same code) lands on every phone still in the
 * room by itself. So ResultsPage passes the student NO `onPlayAgain` — a
 * student-side "play again" that navigated anywhere would take them OUT of the
 * live room, which is the exact drop-off (74 to /education/access vs 29 replays)
 * this piece exists to fix.
 *
 * The contract, rendered: the loud action is "you're still in, stay here";
 * there is no link home, to multiplayer, to the paywall, or to the teacher's
 * report; and the teacher's rematch never reaches a student's card.
 *
 * (This file used to hold four tautologies that never rendered anything —
 * `expect(typeof vi.fn()).toBe('function')` — which is how the unwired
 * callback survived review.)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomResultsCard } from '@/components/education/ClassroomResultsCard';
import type { ClassroomSummary } from '@/shared/types/classroom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

// If the teacher's Pro check ever mounted on a student card this would fire
// on thirty phones; make it loud if it does.
const useTeacherPro = vi.fn(() => ({ hasPro: true, loading: false }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => useTeacherPro() }));

const summary = {
  teacherName: 'Ms Levi',
  lessonNames: ['Week 3'],
  lessonIds: ['lesson-1'],
  totalWords: 4,
  classFoundCount: 2,
  coverage: [
    { word: 'apple', foundBy: ['Noa'] },
    { word: 'river', foundBy: [] },
  ],
  masteryByPlayer: { Noa: { found: 2, total: 4 } },
  podium: [
    { username: 'Noa', score: 120, rank: 1 },
    { username: 'Dan', score: 80, rank: 2 },
  ],
  missedWords: ['river'],
  neverPlacedWords: [],
} as unknown as ClassroomSummary;

function renderStudent() {
  return render(
    <ClassroomResultsCard
      summary={summary}
      username="Dan"
      isTeacher={false}
      standings={[
        { username: 'Noa', score: 120 },
        { username: 'Dan', score: 80 },
      ]}
      onPractice={vi.fn()}
    />
  );
}

describe('classroom results — the student stays in class', () => {
  it('makes "wait for the next game" the primary, not a launcher', () => {
    renderStudent();
    expect(screen.getByTestId('wait-for-teacher-message')).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('play-again-button')).toBeNull();
  });

  it('offers no way out of the class: no home, multiplayer, paywall or report link', () => {
    const { container } = renderStudent();
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    const exits = hrefs.filter((h) =>
      /\/education\/access|\/multiplayer|\/pricing|\/upgrade|\/teacher\/reports|^\/[a-z]{2}\/?$/.test(h)
    );
    expect(exits).toEqual([]);
  });

  it("never shows the teacher's rematch or report to a student", () => {
    renderStudent();
    expect(screen.queryByTestId('rematch-same-list')).toBeNull();
    expect(screen.queryByTestId('full-report-link')).toBeNull();
    expect(useTeacherPro).not.toHaveBeenCalled();
  });
});
