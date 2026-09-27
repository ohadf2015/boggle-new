import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReturningUserStep from '@/components/onboarding/ReturningUserStep';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    language: 'en',
  }),
}));

vi.mock('@/utils/onboardingStorage', () => ({
  markOnboardingSkipped: vi.fn(),
}));

import { markOnboardingSkipped } from '@/utils/onboardingStorage';

describe('ReturningUserStep', () => {
  const onHaveAccount = vi.fn();
  const onNew = vi.fn();
  const onSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderStep = () =>
    render(
      <ReturningUserStep
        onHaveAccount={onHaveAccount}
        onNew={onNew}
        onSkip={onSkip}
      />
    );

  it('renders title', () => {
    renderStep();
    expect(screen.getByText('onboarding.returningUser.title')).toBeTruthy();
  });

  it('renders three action buttons', () => {
    renderStep();
    expect(screen.getByText('onboarding.returningUser.haveAccount')).toBeTruthy();
    expect(screen.getByText('onboarding.returningUser.newHere')).toBeTruthy();
    expect(screen.getByText('onboarding.returningUser.skip')).toBeTruthy();
  });

  it('calls onHaveAccount when "I have an account" is pressed', () => {
    renderStep();
    fireEvent.click(screen.getByText('onboarding.returningUser.haveAccount'));
    expect(onHaveAccount).toHaveBeenCalledOnce();
  });

  it('calls onNew when "I\'m new here" is pressed', () => {
    renderStep();
    fireEvent.click(screen.getByText('onboarding.returningUser.newHere'));
    expect(onNew).toHaveBeenCalledOnce();
  });

  it('calls markOnboardingSkipped and onSkip when Skip is pressed', () => {
    renderStep();
    fireEvent.click(screen.getByText('onboarding.returningUser.skip'));
    expect(markOnboardingSkipped).toHaveBeenCalledOnce();
    expect(onSkip).toHaveBeenCalledOnce();
  });
});
