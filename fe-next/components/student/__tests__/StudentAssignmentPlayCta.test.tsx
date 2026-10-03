import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentAssignmentPlayCta } from '../StudentAssignmentPlayCta';
import type { NextOpenAssignment } from '../nextOpenAssignment';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : _key),
    language: 'en',
  }),
}));

const capture = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => capture(...args) },
}));

const open: NextOpenAssignment = {
  assignmentId: 'asg-9',
  lessonId: 'week-3',
  title: 'Week 3 Vocabulary',
  dueDate: '2026-10-10T00:00:00Z',
  href: '/en/student/lessons/week-3',
};

describe('StudentAssignmentPlayCta — next-open-assignment', () => {
  beforeEach(() => {
    capture.mockClear();
  });

  it('Given zero open assignments, Then the Play CTA is absent', () => {
    const { container } = render(<StudentAssignmentPlayCta next={null} />);
    expect(screen.queryByTestId('student_assignment_cta')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('Given one open assignment, Then the Play CTA is present with the deep-link href', () => {
    render(<StudentAssignmentPlayCta next={open} />);
    const cta = screen.getByTestId('student_assignment_cta');
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/en/student/lessons/week-3');
  });
});
