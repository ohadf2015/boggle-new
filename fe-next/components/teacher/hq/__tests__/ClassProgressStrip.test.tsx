import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const capture = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fallback?: string) => (typeof fallback === 'string' ? fallback : k),
    language: 'en',
  }),
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: (...args: unknown[]) => capture(...args),
    register: vi.fn(),
    __loaded: true,
  },
}));

import { ClassProgressStrip } from '../ClassProgressStrip';

describe('<ClassProgressStrip>', () => {
  beforeEach(() => {
    capture.mockClear();
  });

  it('Given no students, Then the strip is not in the document', () => {
    render(
      <ClassProgressStrip
        classroomId="c1"
        studentCount={0}
        assignmentCount={2}
        submittedCount={0}
        hasPro={false}
      />,
    );
    expect(screen.queryByTestId('hq-class-progress')).toBeNull();
    expect(capture).not.toHaveBeenCalled();
  });

  it('Given students but 0 assignments, Then the strip is hidden', () => {
    render(
      <ClassProgressStrip
        classroomId="c1"
        studentCount={3}
        assignmentCount={0}
        submittedCount={0}
        hasPro={false}
      />,
    );
    expect(screen.queryByTestId('hq-class-progress')).toBeNull();
  });

  it('Given students and assignments with 0 submissions, Then counts render and teacher_hq_progress_viewed fires', () => {
    render(
      <ClassProgressStrip
        classroomId="c1"
        studentCount={4}
        assignmentCount={2}
        submittedCount={0}
        hasPro={false}
      />,
    );
    expect(screen.getByTestId('hq-class-progress')).toBeInTheDocument();
    expect(screen.getByTestId('hq-class-progress-students')).toHaveTextContent('4');
    expect(screen.getByTestId('hq-class-progress-assignments')).toHaveTextContent('2');
    expect(screen.getByTestId('hq-class-progress-submitted')).toHaveTextContent('0');
    expect(capture).toHaveBeenCalledWith('teacher_hq_progress_viewed', {
      classroom_id: 'c1',
      student_count: 4,
      assignment_count: 2,
      submitted_count: 0,
      has_pro: false,
    });
  });

  it('Given non-zero submissions, Then the submitted count is shown', () => {
    render(
      <ClassProgressStrip
        classroomId="c1"
        studentCount={5}
        assignmentCount={3}
        submittedCount={7}
        hasPro={true}
      />,
    );
    expect(screen.getByTestId('hq-class-progress-submitted')).toHaveTextContent('7');
    expect(screen.queryByTestId('hq-class-progress-upgrade')).toBeNull();
  });

  it('Given a free teacher, Then one upgrade link reuses /teacher/upgrade and fires teacher_hq_upgrade_clicked', () => {
    render(
      <ClassProgressStrip
        classroomId="c1"
        studentCount={2}
        assignmentCount={1}
        submittedCount={0}
        hasPro={false}
      />,
    );
    const link = screen.getByTestId('hq-class-progress-upgrade');
    expect(link).toHaveAttribute('href', '/en/teacher/upgrade');
    fireEvent.click(link);
    expect(capture).toHaveBeenCalledWith('teacher_hq_upgrade_clicked', {
      classroom_id: 'c1',
    });
  });

  it('Given an action, Then it renders inside the strip row', () => {
    render(
      <ClassProgressStrip
        classroomId="c1"
        studentCount={2}
        assignmentCount={1}
        submittedCount={0}
        hasPro={true}
        action={<button type="button">go</button>}
      />,
    );
    expect(screen.getByTestId('hq-class-progress')).toContainElement(screen.getByRole('button', { name: 'go' }));
  });
});
