/**
 * TeacherHelpButton — the "?" control TeacherOnboarding's own doc comment has
 * promised since it shipped ("Reopenable from the teacher dashboard '?' button
 * (forceShow)"). The prop was implemented and tested; the trigger never was, so
 * once a teacher dismissed the walkthrough it was gone for good.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const onboardingState = {
  shouldShowOnboarding: false,
  currentStep: 0,
  completedSteps: [] as string[],
  isCompleted: true,
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

import { TeacherHelpButton } from '../TeacherHelpButton';

describe('TeacherHelpButton', () => {
  beforeEach(() => {
    lang.current = 'en';
    // The state a complaining teacher is actually in: already dismissed.
    onboardingState.shouldShowOnboarding = false;
  });

  it('renders a labelled control', () => {
    render(<TeacherHelpButton />);
    expect(screen.getByTestId('teacher-help-button')).toHaveAttribute(
      'aria-label',
      'education.onboarding.showTutorial',
    );
  });

  it('shows nothing until asked', () => {
    render(<TeacherHelpButton />);
    expect(screen.queryByTestId('onboarding-step-create')).toBeNull();
  });

  it('reopens the walkthrough even though onboarding is already dismissed', () => {
    render(<TeacherHelpButton />);
    fireEvent.click(screen.getByTestId('teacher-help-button'));
    for (const id of ['create', 'share', 'join', 'play', 'results']) {
      expect(screen.getByTestId(`onboarding-step-${id}`)).toBeInTheDocument();
    }
  });

  it('closes again on dismiss, so the button is a toggle not a trap', () => {
    render(<TeacherHelpButton />);
    fireEvent.click(screen.getByTestId('teacher-help-button'));
    fireEvent.click(screen.getByLabelText('common.skip'));
    expect(screen.queryByTestId('onboarding-step-create')).toBeNull();
  });
});
