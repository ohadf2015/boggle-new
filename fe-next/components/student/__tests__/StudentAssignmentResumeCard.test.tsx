import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudentAssignmentResumeCard } from '../StudentAssignmentResumeCard';
import type { NextOpenAssignment } from '../nextOpenAssignment';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback?: string, params?: Record<string, string>) =>
      (typeof fallback === 'string' ? fallback : _key).replace(/\{(\w+)\}/g, (_, k) => params?.[k] ?? `{${k}}`),
    language: 'en',
  }),
}));

const capture = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => capture(...args) },
}));

const started: NextOpenAssignment = {
  assignmentId: 'asg-9',
  lessonId: 'week-3',
  title: 'Week 3 Vocabulary',
  dueDate: '2026-10-10T00:00:00Z',
  href: '/en/student/lessons/week-3',
};

describe('StudentAssignmentResumeCard', () => {
  beforeEach(() => {
    capture.mockClear();
  });

  it('Given nothing started, Then the card is absent', () => {
    const { container } = render(<StudentAssignmentResumeCard next={null} />);
    expect(screen.queryByTestId('student_assignment_resume')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('Given a started assignment, Then the card resumes it with the deep-link href', () => {
    render(<StudentAssignmentResumeCard next={started} />);
    const card = screen.getByTestId('student_assignment_resume');
    const cta = screen.getByTestId('student_assignment_resume_cta');
    expect(card).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/en/student/lessons/week-3');
    expect(cta).toHaveAttribute('data-assignment-id', 'asg-9');
    expect(cta).toHaveTextContent('Resume Week 3 Vocabulary');
  });

  it('clicking the resume CTA tracks the resume event', () => {
    render(<StudentAssignmentResumeCard next={started} />);
    fireEvent.click(screen.getByTestId('student_assignment_resume_cta'));
    expect(capture).toHaveBeenCalledWith('student_assignment_resume_clicked', {
      assignment_id: 'asg-9',
      lesson_id: 'week-3',
    });
  });
});
