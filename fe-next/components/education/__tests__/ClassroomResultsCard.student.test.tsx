/**
 * The student half of the results card.
 *
 * A live three-round capture found ZERO student results screens: the class
 * played, the projector celebrated, and every phone went back to a join screen.
 * Half of that was plumbing (`classroomSummary` dropped on the player's socket
 * path, fixed in usePlayerGameEvents); this file pins the other half — that
 * when a student DOES land here, the first thing on the card is their own
 * round, not the teacher's reteach list.
 *
 * The teacher's card must not grow a student hero, and the student's card must
 * not grow teacher controls: two audiences, one component, no leakage.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ClassroomResultsCard } from '../ClassroomResultsCard';
import type { ClassroomSummary } from '@/shared/types/classroom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: true, loading: false }),
}));

vi.mock('@/utils/shareWithFallback', () => ({
  shareWithFallback: vi.fn().mockResolvedValue('copied'),
}));
vi.mock('@/lib/education/missedWordsPracticeSheet', () => ({
  openMissedWordsPracticeSheet: vi.fn().mockReturnValue(true),
}));
vi.mock('@/lib/education/unpluggedReteachPrintablePack', () => ({
  openUnpluggedReteachPrintablePack: vi.fn().mockReturnValue(true),
}));

const summary: ClassroomSummary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Physics 101'],
  lessonIds: ['lesson-1'],
  totalWords: 4,
  coverage: [
    { word: 'photon', foundBy: ['Maya'] },
    { word: 'atom', foundBy: ['Maya', 'Noa'] },
    { word: 'neutron', foundBy: [] },
    { word: 'quark', foundBy: [] },
  ],
  missedWords: ['neutron', 'quark'],
  classFoundCount: 2,
  masteryByPlayer: {
    Maya: { found: 2, total: 4 },
    Noa: { found: 1, total: 4 },
  },
  podium: [
    { username: 'Maya', score: 90, rank: 1, wordsFound: 2, totalWords: 4 },
    { username: 'Noa', score: 70, rank: 2, wordsFound: 1, totalWords: 4 },
  ],
};

const standings = [
  { username: 'Maya', score: 90 },
  { username: 'Noa', score: 70 },
  { username: 'Eitan', score: 20 },
];

describe('ClassroomResultsCard — what the student sees', () => {
  it('opens with the student\'s own placing when the standings are known', () => {
    render(
      <ClassroomResultsCard
        summary={summary}
        username="Noa"
        isTeacher={false}
        standings={standings}
      />
    );
    const hero = screen.getByTestId('student-round-outcome');
    expect(hero.dataset.rank).toBe('2');
    expect(hero).toHaveTextContent('70');
  });

  it('draws the placing above the podium — my round first, then the room\'s', () => {
    render(
      <ClassroomResultsCard
        summary={summary}
        username="Noa"
        isTeacher={false}
        standings={standings}
      />
    );
    const hero = screen.getByTestId('student-round-outcome');
    const podium = screen.getByTestId('podium-place-1');
    expect(hero.compareDocumentPosition(podium) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('carries the student\'s own lesson-word tally into the hero, not the class total', () => {
    render(
      <ClassroomResultsCard
        summary={summary}
        username="Noa"
        isTeacher={false}
        standings={standings}
      />
    );
    expect(screen.getByTestId('student-outcome-words')).toHaveTextContent('"found":1');
  });

  it('never shows the teacher a student placing hero on their own card', () => {
    render(
      <ClassroomResultsCard
        summary={summary}
        username="Ms. Cohen"
        isTeacher
        standings={standings}
      />
    );
    expect(screen.queryByTestId('student-round-outcome')).not.toBeInTheDocument();
  });

  it('still renders the card when no standings ride along (older payload)', () => {
    render(<ClassroomResultsCard summary={summary} username="Noa" isTeacher={false} />);
    expect(screen.queryByTestId('student-round-outcome')).not.toBeInTheDocument();
    expect(screen.getByTestId('podium-place-1')).toBeInTheDocument();
  });

  it('keeps the reteach list off a student phone — that is the teacher\'s list', () => {
    render(
      <ClassroomResultsCard
        summary={summary}
        username="Noa"
        isTeacher={false}
        standings={standings}
      />
    );
    expect(screen.queryByTestId('reteach-list')).not.toBeInTheDocument();
  });

  /**
   * "Who needs help" names the children who found under half the list. On a
   * teacher's laptop that is differentiation; on a phone in the hand of a
   * fifteen-year-old sitting next to them it is a public list of who did worst.
   * It never leaves the teacher's card.
   */
  it('never shows a student who in the class needs help', () => {
    render(
      <ClassroomResultsCard
        summary={{ ...summary, masteryByPlayer: { Noa: { found: 1, total: 4 }, Dana: { found: 0, total: 4 } } }}
        username="Noa"
        isTeacher={false}
        standings={[{ username: 'Noa', score: 30 }, { username: 'Dana', score: 10 }]}
      />
    );
    expect(screen.queryByTestId('class-needs-help')).not.toBeInTheDocument();
    expect(screen.queryByTestId('class-needs-help-none')).not.toBeInTheDocument();
  });

  it('gives the teacher that list on the same screen as the podium', () => {
    render(
      <ClassroomResultsCard
        summary={{ ...summary, masteryByPlayer: { Noa: { found: 1, total: 4 }, Dana: { found: 0, total: 4 } } }}
        username="Ms. Gauntlet"
        isTeacher
      />
    );
    expect(screen.getByTestId('class-needs-help')).toHaveTextContent('Dana');
  });
});
