/**
 * TeacherOnboardingChecklist — four steps, empty-state CTAs, PostHog event.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { TeacherOnboardingChecklist } from '../TeacherOnboardingChecklist';
import { classroomInvitePayload } from '@/lib/education/classroomInvitePayload';

const trackTeacherOnboardingStep = vi.fn();

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/education/telemetry', () => ({
  trackTeacherOnboardingStep: (...args: unknown[]) => trackTeacherOnboardingStep(...args),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const writeText = vi.fn().mockResolvedValue(undefined);

describe('TeacherOnboardingChecklist', () => {
  beforeEach(() => {
    trackTeacherOnboardingStep.mockClear();
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  it('routes the empty classroom step to the create-classroom CTA', () => {
    const onCreateClassroom = vi.fn();
    render(
      <TeacherOnboardingChecklist
        classroomCount={0}
        assignmentCount={0}
        rosterCount={0}
        hasProgressReport={false}
        reportsHref="/en/teacher/reports"
        onCreateClassroom={onCreateClassroom}
        onCreateAssignment={vi.fn()}
      />,
    );

    const card = screen.getByTestId('teacher-onboarding-checklist');
    expect(card).toHaveAttribute('data-current', 'create_classroom');
    fireEvent.click(screen.getByTestId('teacher-onboarding-cta-create-classroom'));
    expect(onCreateClassroom).toHaveBeenCalledTimes(1);
    expect(trackTeacherOnboardingStep).toHaveBeenCalledWith({
      step: 'create_classroom',
      action: 'view',
    });
    expect(trackTeacherOnboardingStep).toHaveBeenCalledWith({
      step: 'create_classroom',
      action: 'cta',
    });
  });

  it('opens the assignment creator when a classroom exists but no assignment does', () => {
    const onCreateAssignment = vi.fn();
    render(
      <TeacherOnboardingChecklist
        classroomCount={1}
        assignmentCount={0}
        rosterCount={0}
        hasProgressReport={false}
        joinCode="Q3UQ2J"
        reportsHref="/en/teacher/reports"
        onCreateClassroom={vi.fn()}
        onCreateAssignment={onCreateAssignment}
      />,
    );

    expect(screen.getByTestId('teacher-onboarding-step-create_first_assignment')).toHaveAttribute(
      'data-status',
      'todo',
    );
    fireEvent.click(screen.getByTestId('teacher-onboarding-cta-create-assignment'));
    expect(onCreateAssignment).toHaveBeenCalledTimes(1);
    expect(trackTeacherOnboardingStep).toHaveBeenCalledWith({
      step: 'create_first_assignment',
      action: 'cta',
    });
  });

  it('copies the join payload from the share-join empty state', () => {
    render(
      <TeacherOnboardingChecklist
        classroomCount={1}
        assignmentCount={1}
        rosterCount={0}
        hasProgressReport={false}
        joinCode="Q3UQ2J"
        reportsHref="/en/teacher/reports"
        onCreateClassroom={vi.fn()}
        onCreateAssignment={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('teacher-onboarding-cta-share-join'));
    expect(writeText).toHaveBeenCalledWith(
      classroomInvitePayload(window.location.origin, 'en', 'Q3UQ2J'),
    );
    expect(trackTeacherOnboardingStep).toHaveBeenCalledWith({
      step: 'share_join_link',
      action: 'cta',
    });
  });

  it('routes the progress-report empty state to the reports screen', () => {
    render(
      <TeacherOnboardingChecklist
        classroomCount={1}
        assignmentCount={1}
        rosterCount={2}
        hasProgressReport={false}
        joinCode="Q3UQ2J"
        reportsHref="/en/teacher/reports?classroomId=c1"
        onCreateClassroom={vi.fn()}
        onCreateAssignment={vi.fn()}
      />,
    );

    const link = screen.getByTestId('teacher-onboarding-cta-view-report');
    expect(link).toHaveAttribute('href', '/en/teacher/reports?classroomId=c1');
  });

  it('hides once every step is done', () => {
    const { container } = render(
      <TeacherOnboardingChecklist
        classroomCount={1}
        assignmentCount={2}
        rosterCount={4}
        hasProgressReport={true}
        joinCode="Q3UQ2J"
        reportsHref="/en/teacher/reports"
        onCreateClassroom={vi.fn()}
        onCreateAssignment={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  describe('hideCreateClassroomCta prop', () => {
    it('hides the create-classroom CTA when hideCreateClassroomCta is true', () => {
      const onCreateClassroom = vi.fn();
      render(
        <TeacherOnboardingChecklist
          classroomCount={0}
          assignmentCount={null}
          rosterCount={0}
          hasProgressReport={null}
          joinCode={undefined}
          reportsHref="/en/teacher/reports"
          onCreateClassroom={onCreateClassroom}
          onCreateAssignment={vi.fn()}
          hideCreateClassroomCta={true}
        />,
      );

      const card = screen.getByTestId('teacher-onboarding-checklist');
      expect(card).toHaveAttribute('data-current', 'create_classroom');

      // The create-classroom CTA button is hidden
      expect(screen.queryByTestId('teacher-onboarding-cta-create-classroom')).not.toBeInTheDocument();

      // But the view event should still fire
      expect(trackTeacherOnboardingStep).toHaveBeenCalledWith({
        step: 'create_classroom',
        action: 'view',
      });
    });

    it('shows the create-classroom CTA when hideCreateClassroomCta is false (default)', () => {
      const onCreateClassroom = vi.fn();
      render(
        <TeacherOnboardingChecklist
          classroomCount={0}
          assignmentCount={null}
          rosterCount={0}
          hasProgressReport={null}
          joinCode={undefined}
          reportsHref="/en/teacher/reports"
          onCreateClassroom={onCreateClassroom}
          onCreateAssignment={vi.fn()}
          hideCreateClassroomCta={false}
        />,
      );

      // The create-classroom CTA button should be visible
      const button = screen.getByTestId('teacher-onboarding-cta-create-classroom');
      expect(button).toBeInTheDocument();

      // Clicking it should call the callback
      fireEvent.click(button);
      expect(onCreateClassroom).toHaveBeenCalledTimes(1);

      // And fire the telemetry event
      expect(trackTeacherOnboardingStep).toHaveBeenCalledWith({
        step: 'create_classroom',
        action: 'cta',
      });
    });

    it('preserves telemetry continuity when create CTA is hidden on the dashboard', () => {
      // When hideCreateClassroomCta is true, the first-run card on the
      // dashboard will fire the 'cta' event when the teacher creates a class.
      // This test verifies the component still fires the 'view' event.
      const onCreateClassroom = vi.fn();
      render(
        <TeacherOnboardingChecklist
          classroomCount={0}
          assignmentCount={null}
          rosterCount={0}
          hasProgressReport={null}
          joinCode={undefined}
          reportsHref="/en/teacher/reports"
          onCreateClassroom={onCreateClassroom}
          onCreateAssignment={vi.fn()}
          hideCreateClassroomCta={true}
        />,
      );

      // The view event fires even with the CTA hidden
      expect(trackTeacherOnboardingStep).toHaveBeenCalledWith({
        step: 'create_classroom',
        action: 'view',
      });

      // No 'cta' event is fired from this component (because the button is
      // hidden), but PlayTabFirstRunCard will fire it when the teacher clicks there
    });
  });
});
