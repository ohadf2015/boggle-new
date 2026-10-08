/**
 * Compact checklist: once the class is live-ready, the four-step list gives way
 * to its progress line so the join code stays above the fold.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeacherOnboardingChecklist } from '../TeacherOnboardingChecklist';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/lib/education/telemetry', () => ({
  trackTeacherOnboardingStep: vi.fn(),
}));

const base = {
  classroomCount: 1,
  assignmentCount: 0,
  rosterCount: 3,
  reportsHref: '/en/teacher/reports',
  onCreateClassroom: vi.fn(),
  onCreateAssignment: vi.fn(),
};

describe('TeacherOnboardingChecklist compact mode', () => {
  it('Given compact, Then the progress line stays and the four-step list is gone', () => {
    render(<TeacherOnboardingChecklist {...base} compact />);
    expect(screen.getByTestId('teacher-onboarding-checklist')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('teacher-onboarding-step-create_first_assignment')).not.toBeInTheDocument();
  });

  it('Given not compact, Then every step is listed', () => {
    render(<TeacherOnboardingChecklist {...base} />);
    expect(screen.getByTestId('teacher-onboarding-step-create_first_assignment')).toBeInTheDocument();
  });
});
