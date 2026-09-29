/**
 * ClassArcPanel — the free "learning arc" surface on the class report view:
 * words the class keeps missing (with the one-click follow-up) above a roster
 * where EVERY student appears, stuck-first, evidence or not.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ClassMastery } from '@/lib/education/wordMasteryTrend';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' } }) }));

let mastery: ClassMastery | null = null;
let masteryLoading = false;
let masteryError: Error | null = null;
vi.mock('@/hooks/useWordMasteryTrend', () => ({
  useWordMasteryTrend: () => ({ mastery, isLoading: masteryLoading, error: masteryError, refresh: vi.fn() }),
}));

const getClassroomStudents = vi.fn();
vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomStudents: (...a: unknown[]) => getClassroomStudents(...a),
}));

const createLesson = vi.fn();
vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: () => ({ createLesson }),
}));

const createLessonAndAssign = vi.fn();
vi.mock('@/lib/education/createLessonWithAssignment', () => ({
  createLessonAndAssign: (...a: unknown[]) => createLessonAndAssign(...a),
}));

import { ClassArcPanel } from '../ClassArcPanel';

const MASTERY: ClassMastery = {
  students: [
    {
      studentId: 's1',
      words: [
        { word: 'apple', display: 'Apple', attempts: 2, correct: 0, firstSeen: '2026-09-10T10:00:00Z', lastSeen: '2026-09-20T10:00:00Z', lastCorrect: false, trend: 'stuck', outcomes: [false, false] },
        { word: 'plum', display: 'Plum', attempts: 2, correct: 2, firstSeen: '2026-09-10T10:00:00Z', lastSeen: '2026-09-20T10:00:00Z', lastCorrect: true, trend: 'mastered', outcomes: [true, true] },
      ],
      stuckWords: ['apple'],
      masteredCount: 1,
    },
  ],
  classStuckWords: [
    { word: 'apple', display: 'Apple', studentsStuck: 2, studentsWithEvidence: 3 },
    { word: 'berry', display: 'Berry', studentsStuck: 1, studentsWithEvidence: 2 },
  ],
  sessionsAnalyzed: 4,
  rowsSkipped: 0,
};

const ROSTER = [
  { student_id: 's1', profiles: { username: 'sam', display_name: 'Sam' } },
  { student_id: 's2', profiles: { username: 'mia', display_name: 'Mia' } },
];

function renderPanel(onStudentClick = vi.fn()) {
  return render(
    <ClassArcPanel
      classroomId="c1"
      classroomName="Band 2"
      classroomLanguage="en"
      onStudentClick={onStudentClick}
    />
  );
}

describe('<ClassArcPanel>', () => {
  beforeEach(() => {
    mastery = MASTERY;
    masteryLoading = false;
    masteryError = null;
    getClassroomStudents.mockReset().mockResolvedValue({ data: ROSTER, error: null });
    createLesson.mockReset();
    createLessonAndAssign.mockReset().mockResolvedValue({ success: true, lesson: { id: 'l1' }, assigned: true });
  });

  it('shows a loading state while mastery or roster load', () => {
    masteryLoading = true;
    renderPanel();
    expect(screen.getByTestId('class-arc-loading')).toBeInTheDocument();
  });

  it('shows the empty state when no session has produced evidence yet', async () => {
    mastery = { students: [], classStuckWords: [], sessionsAnalyzed: 0, rowsSkipped: 0 };
    renderPanel();
    expect(await screen.findByTestId('class-arc-empty')).toHaveTextContent('teacher.reports.arc.noEvidenceClass');
    expect(screen.queryByTestId('class-arc-assign')).not.toBeInTheDocument();
  });

  it('lists the words the class keeps missing, worst first, with the follow-up CTA', async () => {
    renderPanel();
    const chips = await screen.findAllByTestId('class-arc-stuck-chip');
    expect(chips[0]).toHaveTextContent('Apple');
    expect(chips[1]).toHaveTextContent('Berry');
    expect(screen.getByTestId('class-arc-assign')).toHaveTextContent('teacher.reports.arc.assignFollowUp');
    expect(screen.getByTestId('class-arc-requeue-note')).toBeInTheDocument();
  });

  it('renders every roster student, and a click drills into that student', async () => {
    const onStudentClick = vi.fn();
    renderPanel(onStudentClick);
    const rows = await screen.findAllByTestId('class-arc-student');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Sam');
    const quiet = screen.getByTestId('class-arc-student-s2');
    expect(quiet).toHaveTextContent('Mia');
    expect(quiet).toHaveTextContent('teacher.reports.arc.noEvidenceStudent');
    fireEvent.click(rows[0].querySelector('button')!);
    expect(onStudentClick).toHaveBeenCalledWith('s1', 'Sam');
  });

  it('assigns a follow-up lesson built from the stuck words, then confirms', async () => {
    renderPanel();
    fireEvent.click(await screen.findByTestId('class-arc-assign'));

    await waitFor(() => expect(createLessonAndAssign).toHaveBeenCalledTimes(1));
    const arg = createLessonAndAssign.mock.calls[0][0] as {
      lesson: { words: { word: string }[]; classroomId?: string; language: string };
      teacherId: string;
    };
    expect(arg.lesson.words.map((w) => w.word)).toEqual(['Apple', 'Berry']);
    expect(arg.lesson.classroomId).toBe('c1');
    expect(arg.lesson.language).toBe('en');
    expect(arg.teacherId).toBe('teacher-1');
    expect(await screen.findByTestId('class-arc-assigned')).toBeInTheDocument();
  });

  it('says so when the follow-up cannot be assigned', async () => {
    createLessonAndAssign.mockResolvedValue({ success: true, lesson: { id: 'l1' }, assigned: false, assignmentError: 'nope' });
    renderPanel();
    fireEvent.click(await screen.findByTestId('class-arc-assign'));
    expect(await screen.findByRole('alert')).toHaveTextContent('teacher.reports.arc.followUpFailed');
  });
});
