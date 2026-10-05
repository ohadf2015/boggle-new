import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { TeacherOnboardingChecklist } from '../TeacherOnboardingChecklist';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('@/lib/education/telemetry', () => ({ trackTeacherOnboardingStep: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const base = {
  classroomCount: 1,
  assignmentCount: 0,
  rosterCount: 1,
  hasLiveClass: true,
  joinCode: 'ABC234',
  reportsHref: '/en/teacher/reports',
  onCreateClassroom: vi.fn(),
  onCreateAssignment: vi.fn(),
};

describe('TeacherOnboardingChecklist — every tick names what actually happened', () => {
  it('Given a student joined, Then the step says a student joined (not "you shared the link")', () => {
    render(<TeacherOnboardingChecklist {...base} />);
    const step = screen.getByTestId('teacher-onboarding-step-share_join_link');
    expect(step).toHaveAttribute('data-status', 'done');
    expect(step).toHaveTextContent('eduHq.checklist.firstStudent');
    expect(step).not.toHaveTextContent('teacher.onboardingChecklist.shareJoin');
  });

  it('Given a game was played, Then the step says a live game ran', () => {
    render(<TeacherOnboardingChecklist {...base} />);
    const step = screen.getByTestId('teacher-onboarding-step-start_live_class');
    expect(step).toHaveAttribute('data-status', 'done');
    expect(step).toHaveTextContent('eduHq.checklist.firstGame');
  });

  it('Given progress, Then a progress bar reports done of total', () => {
    render(<TeacherOnboardingChecklist {...base} />);
    const bar = within(screen.getByTestId('teacher-onboarding-checklist')).getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemax', '4');
  });

  it('Given the live-game step is current, Then its CTA starts a live class', () => {
    const onStartLive = vi.fn();
    render(
      <TeacherOnboardingChecklist
        {...base}
        assignmentCount={1}
        hasLiveClass={false}
        onStartLive={onStartLive}
      />,
    );
    const cta = screen.getByTestId('teacher-onboarding-cta-start-live');
    expect(cta).toHaveTextContent('teacher.onboardingChecklist.startLiveCta');
  });
});
