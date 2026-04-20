/**
 * OnboardingFlow analytics — FTUE funnel events fire at each step transition.
 * Keeps tight to the 5-step state machine: language -> tutorial -> profile ->
 * scoreReveal -> fork. `score_reveal` carries `action` discriminator so the
 * funnel can split retry friction vs clean continues.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackOnboardingStart: vi.fn(),
  trackOnboardingStep: vi.fn(),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const createMotionComponent = (tag: string) =>
    React.forwardRef(function MotionComponent({ children, ...props }: any, ref: any) {
      return React.createElement(tag, { ref, ...props }, children);
    });
  const motion = new Proxy({} as Record<string, any>, {
    get: (_t, p: string) => createMotionComponent(p),
  });
  return {
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

const mockHasPendingRoom = vi.fn(() => false);
const mockConsumePendingRoom = vi.fn((): string | null => null);
vi.mock('@/utils/onboardingStorage', () => ({
  markOnboardingComplete: vi.fn(),
  markOnboardingSkipped: vi.fn(),
  hasCompletedOnboarding: () => false,
  consumePendingRoomInvite: () => mockConsumePendingRoom(),
  hasPendingRoomInvite: () => mockHasPendingRoom(),
}));

vi.mock('@/utils/contextualGuidanceStorage', () => ({
  markGuidanceShown: vi.fn(),
}));

vi.mock('@/utils/profileStorage', () => ({
  setStoredCustomAvatar: vi.fn(),
  getStoredCustomAvatar: vi.fn(() => null),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));

vi.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../ReturningUserStep', () => ({
  __esModule: true,
  default: ({ onNew }: any) => (
    <button data-testid="new-btn" onClick={onNew}>new</button>
  ),
}));

vi.mock('../LanguageSelect', () => ({
  __esModule: true,
  default: ({ onSelect }: any) => (
    <button data-testid="lang-btn" onClick={onSelect}>lang</button>
  ),
}));

vi.mock('../TutorialGame', () => ({
  __esModule: true,
  default: ({ onComplete }: any) => (
    <button data-testid="tut-btn" onClick={() => onComplete(47, ['CAT', 'DOG', 'STAR'])}>
      tut
    </button>
  ),
}));

vi.mock('../QuickProfileSetup', () => ({
  __esModule: true,
  default: ({ onComplete, hasPendingInvite }: any) => (
    <button
      data-testid="profile-btn"
      data-pending={String(!!hasPendingInvite)}
      onClick={() => onComplete('Player1', {})}
    >
      profile
    </button>
  ),
}));

vi.mock('../ScoreReveal', () => ({
  __esModule: true,
  default: ({ onTryAgain, onContinue }: any) => (
    <>
      <button data-testid="retry-btn" onClick={onTryAgain}>retry</button>
      <button data-testid="continue-btn" onClick={onContinue}>continue</button>
    </>
  ),
}));

vi.mock('../ModeFork', () => ({
  __esModule: true,
  default: ({ onSelectMode }: any) => (
    <button data-testid="mode-btn" onClick={() => onSelectMode('daily')}>daily</button>
  ),
}));

vi.mock('../OnboardingProgress', () => ({
  __esModule: true,
  default: () => null,
}));

import OnboardingFlow from '../OnboardingFlow';
import {
  trackOnboardingStart,
  trackOnboardingStep,
} from '@/utils/growthTracking';

describe('OnboardingFlow analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPendingRoom.mockReturnValue(false);
    mockConsumePendingRoom.mockReturnValue(null);
  });

  const goNew = () => fireEvent.click(screen.getByTestId('new-btn'));

  it('fires onboarding_started once on mount', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    expect(trackOnboardingStart).toHaveBeenCalledTimes(1);
  });

  it('fires step=language on language select', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    goNew();
    fireEvent.click(screen.getByTestId('lang-btn'));
    expect(trackOnboardingStep).toHaveBeenCalledWith('language');
  });

  it('fires step=tutorial with score/wordCount on tutorial complete', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    goNew();
    fireEvent.click(screen.getByTestId('lang-btn'));
    fireEvent.click(screen.getByTestId('tut-btn'));
    expect(trackOnboardingStep).toHaveBeenCalledWith('tutorial', {
      score: 47,
      wordCount: 3,
    });
  });

  it('fires step=profile with hasPendingInvite=false', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    goNew();
    fireEvent.click(screen.getByTestId('lang-btn'));
    fireEvent.click(screen.getByTestId('tut-btn'));
    fireEvent.click(screen.getByTestId('profile-btn'));
    expect(trackOnboardingStep).toHaveBeenCalledWith('profile', {
      hasPendingInvite: false,
    });
  });

  it('fires step=profile with hasPendingInvite=true when invite present', () => {
    mockHasPendingRoom.mockReturnValue(true);
    mockConsumePendingRoom.mockReturnValue('ABC123');
    render(<OnboardingFlow onComplete={vi.fn()} />);
    goNew();
    fireEvent.click(screen.getByTestId('lang-btn'));
    fireEvent.click(screen.getByTestId('tut-btn'));
    fireEvent.click(screen.getByTestId('profile-btn'));
    expect(trackOnboardingStep).toHaveBeenCalledWith('profile', {
      hasPendingInvite: true,
    });
  });

  it('fires step=score_reveal action=continue on Continue', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    goNew();
    fireEvent.click(screen.getByTestId('lang-btn'));
    fireEvent.click(screen.getByTestId('tut-btn'));
    fireEvent.click(screen.getByTestId('profile-btn'));
    fireEvent.click(screen.getByTestId('continue-btn'));
    expect(trackOnboardingStep).toHaveBeenCalledWith('score_reveal', {
      action: 'continue',
    });
  });

  it('fires step=score_reveal action=retry on Try Again (friction signal)', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    goNew();
    fireEvent.click(screen.getByTestId('lang-btn'));
    fireEvent.click(screen.getByTestId('tut-btn'));
    fireEvent.click(screen.getByTestId('profile-btn'));
    fireEvent.click(screen.getByTestId('retry-btn'));
    expect(trackOnboardingStep).toHaveBeenCalledWith('score_reveal', {
      action: 'retry',
    });
  });

  it('fires step=mode_select with mode param', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    goNew();
    fireEvent.click(screen.getByTestId('lang-btn'));
    fireEvent.click(screen.getByTestId('tut-btn'));
    fireEvent.click(screen.getByTestId('profile-btn'));
    fireEvent.click(screen.getByTestId('continue-btn'));
    fireEvent.click(screen.getByTestId('mode-btn'));
    expect(trackOnboardingStep).toHaveBeenCalledWith('mode_select', {
      mode: 'daily',
    });
  });
});
