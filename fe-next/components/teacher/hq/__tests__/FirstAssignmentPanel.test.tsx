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

import { FirstAssignmentPanel } from '../FirstAssignmentPanel';

describe('<FirstAssignmentPanel>', () => {
  beforeEach(() => {
    capture.mockClear();
  });

  it('Given no students, Then the panel is not in the document', () => {
    render(
      <FirstAssignmentPanel
        classroomId="c1"
        studentCount={0}
        assignmentCount={0}
        onCta={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('hq-first-assignment')).toBeNull();
    expect(capture).not.toHaveBeenCalled();
  });

  it('Given students and 0 assignments, Then the panel is shown and fires edu_first_assignment_cta_shown', () => {
    render(
      <FirstAssignmentPanel
        classroomId="c1"
        studentCount={2}
        assignmentCount={0}
        onCta={vi.fn()}
      />,
    );
    expect(screen.getByTestId('hq-first-assignment')).toBeInTheDocument();
    expect(capture).toHaveBeenCalledWith('edu_first_assignment_cta_shown', {
      classroom_id: 'c1',
    });
  });

  it('Given the class already has an assignment, Then the panel is hidden', () => {
    render(
      <FirstAssignmentPanel
        classroomId="c1"
        studentCount={2}
        assignmentCount={1}
        onCta={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('hq-first-assignment')).toBeNull();
  });

  it('When the CTA is tapped, Then it fires edu_first_assignment_cta_clicked and opens the existing flow', () => {
    const onCta = vi.fn();
    render(
      <FirstAssignmentPanel
        classroomId="c1"
        studentCount={1}
        assignmentCount={0}
        onCta={onCta}
      />,
    );
    fireEvent.click(screen.getByTestId('hq-first-assignment-cta'));
    expect(onCta).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('edu_first_assignment_cta_clicked', {
      classroom_id: 'c1',
    });
  });
});
