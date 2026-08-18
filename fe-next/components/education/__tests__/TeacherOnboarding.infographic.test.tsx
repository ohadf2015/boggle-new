/**
 * TeacherOnboarding infographic — renders all 5 steps, dismisses and persists,
 * and can be reopened via forceShow after dismissal.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const onboardingState = {
  shouldShowOnboarding: true,
  currentStep: 0,
  completedSteps: [] as string[],
  isCompleted: false,
  isSkipped: false,
  completeStep: vi.fn(),
  nextStep: vi.fn(),
  prevStep: vi.fn(),
  setStep: vi.fn(),
  complete: vi.fn(),
  skip: vi.fn(),
  reset: vi.fn(),
};

vi.mock('@/lib/education/telemetry', () => ({
  trackEduTeacherOnboardingStep: vi.fn(),
}));

vi.mock('@/hooks/useOnboardingState', () => ({
  useTeacherOnboardingState: () => onboardingState,
}));

const lang = { current: 'en' };
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    language: lang.current,
    dir: lang.current === 'he' ? 'rtl' : 'ltr',
  }),
}));

vi.mock('@/hooks/useFocusTrap', () => ({ useFocusTrap: vi.fn() }));

import { TeacherOnboarding } from '../TeacherOnboarding';

const STEP_IDS = ['create', 'share', 'join', 'play', 'results'];

describe('TeacherOnboarding infographic', () => {
  beforeEach(() => {
    lang.current = 'en';
    onboardingState.shouldShowOnboarding = true;
    Object.values(onboardingState).forEach((v) => {
      if (typeof v === 'function' && 'mockClear' in v) (v as { mockClear: () => void }).mockClear();
    });
  });

  it('renders all 5 steps', () => {
    render(<TeacherOnboarding />);
    for (const id of STEP_IDS) {
      expect(screen.getByTestId(`onboarding-step-${id}`)).toBeInTheDocument();
    }
    // Each step shows its title + one short line
    for (const id of STEP_IDS) {
      expect(screen.getByText(`education.onboarding.steps.${id}.title`)).toBeInTheDocument();
      expect(screen.getByText(`education.onboarding.steps.${id}.text`)).toBeInTheDocument();
    }
  });

  it('dismisses via the primary CTA and persists completion', () => {
    const onComplete = vi.fn();
    render(<TeacherOnboarding onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /onboarding\.gotIt/i }));
    expect(onboardingState.complete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('dismisses via the X button and persists the skip', () => {
    const onSkip = vi.fn();
    render(<TeacherOnboarding onSkip={onSkip} />);
    fireEvent.click(screen.getByLabelText('common.skip'));
    expect(onboardingState.skip).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('stays hidden after dismissal unless forceShow reopens it', () => {
    onboardingState.shouldShowOnboarding = false;
    const { rerender } = render(<TeacherOnboarding />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const onDismiss = vi.fn();
    rerender(<TeacherOnboarding forceShow onDismiss={onDismiss} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /onboarding\.gotIt/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders RTL when the language is Hebrew', () => {
    lang.current = 'he';
    const { container } = render(<TeacherOnboarding />);
    expect(container.firstChild).toHaveAttribute('dir', 'rtl');
  });
});
