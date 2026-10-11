import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { StudentLesson } from '@/hooks/useStudentProgress';

const { state } = vi.hoisted(() => ({
  state: { lessons: [] as StudentLesson[], loading: false },
}));

vi.mock('@/hooks/useStudentProgress', () => ({
  useStudentProgress: () => ({ lessons: state.lessons, isLoading: state.loading }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/components/student/StudentAssignmentPlayCta', () => ({
  StudentAssignmentPlayCta: ({ next }: { next: { title: string } }) => (
    <a data-testid="student_assignment_cta" href="/play">
      {next.title}
    </a>
  ),
}));

vi.mock('@/components/student/nextOpenAssignment', () => ({
  nextOpenAssignment: (rows: StudentLesson[]) =>
    rows.length
      ? {
          assignmentId: 'asg-1',
          lessonId: 'les-1',
          href: '/en/student/lessons/les-1',
          title: 'Week 3',
          dueDate: null,
        }
      : null,
}));

import { JoinNextAssignmentCta } from '../JoinNextAssignmentCta';

describe('JoinNextAssignmentCta', () => {
  beforeEach(() => {
    state.lessons = [];
    state.loading = false;
  });

  it('shows the Play CTA when the class has an open assignment', () => {
    state.lessons = [{ lessonId: 'les-1', status: 'assigned' }];
    render(<JoinNextAssignmentCta classroomId="c1" />);
    expect(screen.getByTestId('student_assignment_cta')).toBeInTheDocument();
  });

  it('falls back to the Academy when there is no open assignment', () => {
    render(<JoinNextAssignmentCta classroomId="c1" />);
    const link = screen.getByTestId('join-open-academy');
    expect(link).toHaveAttribute('href', '/en/student');
  });
});
