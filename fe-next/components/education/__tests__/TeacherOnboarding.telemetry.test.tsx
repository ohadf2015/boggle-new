/**
 * TeacherOnboarding telemetry (F1 wiring)
 *
 * Each step navigation should emit edu_teacher_onboarding_step so we can
 * compute the funnel: signup → step 1 → step 2 → ... → complete vs skip.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const mockTrack = vi.fn();
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
  trackEduTeacherOnboardingStep: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock('@/hooks/useOnboardingState', () => ({
  useTeacherOnboardingState: () => onboardingState,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/hooks/useFocusTrap', () => ({ useFocusTrap: vi.fn() }));

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const passthrough = ({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', rest as React.HTMLAttributes<HTMLDivElement>, children);
  return {
    AdaptiveMotion: { div: passthrough },
    AdaptiveAnimatePresence: passthrough,
  };
});

import { TeacherOnboarding } from '../TeacherOnboarding';

describe('TeacherOnboarding telemetry', () => {
  beforeEach(() => {
    mockTrack.mockClear();
    onboardingState.currentStep = 0;
    Object.values(onboardingState).forEach((v) => {
      if (typeof v === 'function' && 'mockClear' in v) (v as { mockClear: () => void }).mockClear();
    });
  });

  it('fires "next" on step advance', () => {
    render(<TeacherOnboarding />);
    fireEvent.click(screen.getByRole('button', { name: /common\.next/i }));
    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({ step: 0, totalSteps: 4, action: 'next' }),
    );
  });

  it('fires "skip" when user dismisses with the X button', () => {
    render(<TeacherOnboarding />);
    fireEvent.click(screen.getByLabelText('common.skip'));
    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'skip', step: 0 }),
    );
  });

  it('fires "complete" on the last step', () => {
    onboardingState.currentStep = 3;
    render(<TeacherOnboarding />);
    fireEvent.click(screen.getByRole('button', { name: /onboarding\.getStarted/i }));
    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'complete', step: 3 }),
    );
  });
});
