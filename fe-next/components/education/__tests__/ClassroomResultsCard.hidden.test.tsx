/**
 * The calm dial inside the lesson recap (DETAILS sheet). When the teacher hid
 * the leaderboard, the intermission recap keeps the pedagogy — word coverage,
 * who needs help, reteach — but drops every class placing: no podium, no
 * winner spotlight, no rank on the student's own hero. The final screen of the
 * series is the reveal, so this prop is only ever passed before it.
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

describe('ClassroomResultsCard — hideClassPlacings (leaderboard hidden, pre-reveal)', () => {
  it('drops the podium and the winner spotlight', () => {
    render(
      <ClassroomResultsCard
        summary={summary}
        username="Noa"
        isTeacher={false}
        standings={standings}
        hideClassPlacings
      />
    );
    expect(screen.queryByTestId('podium-place-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('winner-spotlight')).not.toBeInTheDocument();
  });

  it('keeps the student hero but strips the class position off it', () => {
    render(
      <ClassroomResultsCard
        summary={summary}
        username="Noa"
        isTeacher={false}
        standings={standings}
        hideClassPlacings
      />
    );
    const hero = screen.getByTestId('student-round-outcome');
    expect(hero.dataset.rank).toBeUndefined();
    expect(hero).toHaveTextContent('70');
    expect(hero).not.toHaveTextContent('education.results.you.won');
  });

  it('keeps the pedagogy: the word-coverage meter still renders', () => {
    render(
      <ClassroomResultsCard
        summary={summary}
        username="Noa"
        isTeacher={false}
        standings={standings}
        hideClassPlacings
      />
    );
    expect(screen.getByTestId('coverage-meter')).toBeInTheDocument();
  });

  it('defaults to the full reveal (podium + ranked hero)', () => {
    render(
      <ClassroomResultsCard
        summary={summary}
        username="Noa"
        isTeacher={false}
        standings={standings}
      />
    );
    expect(screen.getByTestId('podium-place-1')).toBeInTheDocument();
    expect(screen.getByTestId('student-round-outcome').dataset.rank).toBe('2');
  });
});
