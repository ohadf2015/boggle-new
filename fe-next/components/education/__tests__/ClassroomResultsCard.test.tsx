/**
 * Classroom-aware results.
 *
 * The old results screen showed a lesson card built from the TEACHER's
 * sessionStorage, so a room of 25 students saw nothing. This card renders from
 * the server-built summary in the shared results payload, and shows the teacher
 * a class-wide view while each student sees their own.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ClassroomResultsCard } from '../ClassroomResultsCard';
import type { ClassroomSummary } from '@/shared/types/classroom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

const summary: ClassroomSummary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Physics 101'],
  lessonIds: ['lesson-1'],
  totalWords: 3,
  coverage: [
    { word: 'photon', foundBy: ['Maya'] },
    { word: 'atom', foundBy: ['Maya', 'Noa'] },
    { word: 'neutron', foundBy: [] },
  ],
  missedWords: ['neutron'],
  classFoundCount: 2,
  masteryByPlayer: {
    Maya: { found: 2, total: 3 },
    Noa: { found: 1, total: 3 },
  },
};

describe('ClassroomResultsCard', () => {
  it('names the lesson and teacher so a student knows whose class this was', () => {
    render(<ClassroomResultsCard summary={summary} username="Noa" isTeacher={false} />);
    expect(screen.getByText(/Physics 101/)).toBeInTheDocument();
    expect(screen.getByText(/Ms\. Cohen/)).toBeInTheDocument();
  });

  it('shows a student their own mastery, not the class total', () => {
    render(<ClassroomResultsCard summary={summary} username="Noa" isTeacher={false} />);
    expect(screen.getByText(/yourMastery.*"found":1.*"total":3/)).toBeInTheDocument();
  });

  it('marks which lesson words the student personally found and missed', () => {
    render(<ClassroomResultsCard summary={summary} username="Noa" isTeacher={false} />);
    expect(screen.getByTestId('lesson-word-atom')).toHaveAttribute('data-found', 'true');
    expect(screen.getByTestId('lesson-word-photon')).toHaveAttribute('data-found', 'false');
    expect(screen.getByTestId('lesson-word-neutron')).toHaveAttribute('data-found', 'false');
  });

  it('does not show a student the per-word roster of who found what', () => {
    render(<ClassroomResultsCard summary={summary} username="Noa" isTeacher={false} />);
    expect(screen.queryByText(/Maya/)).not.toBeInTheDocument();
  });

  it('gives the teacher the class-wide coverage count', () => {
    render(<ClassroomResultsCard summary={summary} username="Ms. Cohen" isTeacher />);
    expect(screen.getByText(/classCoverage.*"found":2.*"total":3/)).toBeInTheDocument();
  });

  it('gives the teacher the reteach list — the words nobody found', () => {
    render(<ClassroomResultsCard summary={summary} username="Ms. Cohen" isTeacher />);
    expect(screen.getByTestId('reteach-list')).toHaveTextContent('neutron');
  });

  it('tells the teacher how many students found each word', () => {
    render(<ClassroomResultsCard summary={summary} username="Ms. Cohen" isTeacher />);
    expect(screen.getByTestId('lesson-word-atom')).toHaveTextContent('2');
  });

  it('congratulates instead of showing an empty reteach list', () => {
    const clean = { ...summary, missedWords: [], classFoundCount: 3 };
    render(<ClassroomResultsCard summary={clean} username="Ms. Cohen" isTeacher />);
    expect(screen.queryByTestId('reteach-list')).not.toBeInTheDocument();
    expect(screen.getByText(/allFound/)).toBeInTheDocument();
  });

  it('handles a student who found nothing without crashing on a missing mastery row', () => {
    render(<ClassroomResultsCard summary={summary} username="LateJoiner" isTeacher={false} />);
    expect(screen.getByText(/yourMastery.*"found":0.*"total":3/)).toBeInTheDocument();
  });
});
