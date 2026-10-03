import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { teacherAssignHref } from '@/hooks/useTeacherDashboardDeepLink';
import { CreateFirstAssignmentCta } from '../CreateFirstAssignmentCta';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : _key),
    language: 'en',
  }),
}));

const capture = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => capture(...args), register: vi.fn(), __loaded: true },
}));

describe('CreateFirstAssignmentCta — empty-class assignment CTA', () => {
  beforeEach(() => {
    capture.mockClear();
  });

  it('Given 0 assignments, Then the CTA is present with the create-assignment href', () => {
    render(<CreateFirstAssignmentCta classroomId="class-1" assignmentCount={0} />);
    const cta = screen.getByTestId('teacher-first-assignment-cta');
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', teacherAssignHref('en', 'class-1'));
    expect(capture).toHaveBeenCalledWith('teacher_first_assignment_cta_viewed', {
      classroom_id: 'class-1',
    });
  });

  it('Given 1+ assignments, Then the empty-state CTA is hidden', () => {
    render(<CreateFirstAssignmentCta classroomId="class-1" assignmentCount={1} />);
    expect(screen.queryByTestId('teacher-first-assignment-cta')).not.toBeInTheDocument();
    expect(capture).not.toHaveBeenCalled();
  });

  it('When the CTA is tapped, Then it fires teacher_first_assignment_cta_clicked', () => {
    render(<CreateFirstAssignmentCta classroomId="class-1" assignmentCount={0} />);
    fireEvent.click(screen.getByTestId('teacher-first-assignment-cta'));
    expect(capture).toHaveBeenCalledWith('teacher_first_assignment_cta_clicked', {
      classroom_id: 'class-1',
    });
  });
});
