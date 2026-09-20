import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsSignupModal } from '../ResultsSignupModal';
import type { WordHuntResult } from '@/utils/dailyChallenge/types';
import { en } from '@/translations/en';

// Mock the auth functions
vi.mock('@/lib/supabase', () => ({
  signInWithMagicLink: vi.fn(),
  sendOtpCode: vi.fn(),
  verifyOtpCode: vi.fn(),
}));

// Mock useOAuthSignIn
vi.mock('@/components/auth/hooks/useOAuthSignIn', () => ({
  useOAuthSignIn: () => ({
    signIn: vi.fn(),
  }),
}));

// Mock language context
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    language: 'en',
  }),
}));

// Mock CrazyGames
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isOnCrazyGamesPlatform: false,
  }),
}));

// Mock pending result save
vi.mock('@/utils/dailyChallenge', () => ({
  setPendingDailyResult: vi.fn(),
}));

// Mock validation
vi.mock('@/utils/validation', () => ({
  validateEmail: (email: string) => ({
    isValid: email.includes('@'),
    error: email.includes('@') ? null : 'validation.emailInvalid',
  }),
}));

const mockPendingResult: WordHuntResult & { puzzleNumber: number; puzzleDate: string; language: 'en' } = {
  solved: true,
  wordsDiscovered: [{ word: 'test', score: 10, rarity: 0.5 }],
  attemptsUsed: 2,
  lifeRemaining: 1,
  extraTries: 0,
  efficiencyScore: 80,
  puzzleNumber: 100,
  puzzleDate: '2026-09-20',
  language: 'en',
};

describe('ResultsSignupModal', () => {
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    mockOnDismiss.mockClear();
  });

  it('renders with heading and email input', () => {
    render(
      <ResultsSignupModal
        pendingResult={mockPendingResult}
        onDismiss={mockOnDismiss}
      />
    );

    // Check for the main heading
    expect(screen.getByText('daily.results.signup.shortPrompt')).toBeInTheDocument();

    // Check for email input
    expect(screen.getByPlaceholderText('auth.inlineSignup.emailPlaceholder')).toBeInTheDocument();

    // Check for Google button
    expect(screen.getByText(/auth.google.signUp/)).toBeInTheDocument();
  });

  it('shows close button that calls onDismiss', () => {
    render(
      <ResultsSignupModal
        pendingResult={mockPendingResult}
        onDismiss={mockOnDismiss}
      />
    );

    const closeButton = screen.getByLabelText('common.dismiss');
    fireEvent.click(closeButton);

    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('validates email format before submission', async () => {
    const user = userEvent.setup();

    render(
      <ResultsSignupModal
        pendingResult={mockPendingResult}
        onDismiss={mockOnDismiss}
      />
    );

    const emailInput = screen.getByPlaceholderText('auth.inlineSignup.emailPlaceholder') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /auth.magicLink.sendLink/ });

    // Enter invalid email
    await user.type(emailInput, 'invalid-email');

    // Button should be disabled
    expect(submitButton).toBeDisabled();

    // Enter valid email
    await user.clear(emailInput);
    await user.type(emailInput, 'test@example.com');

    // Button should be enabled
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('shows Google OAuth button', () => {
    render(
      <ResultsSignupModal
        pendingResult={mockPendingResult}
        onDismiss={mockOnDismiss}
      />
    );

    const googleButton = screen.getByText(/auth.google.signUp/);
    expect(googleButton).toBeInTheDocument();
  });

  it('has divider between OAuth and email form', () => {
    render(
      <ResultsSignupModal
        pendingResult={mockPendingResult}
        onDismiss={mockOnDismiss}
      />
    );

    // Look for the "or" text in the divider
    expect(screen.getByText('or')).toBeInTheDocument();
  });

  it('disables submit button when email is empty', () => {
    render(
      <ResultsSignupModal
        pendingResult={mockPendingResult}
        onDismiss={mockOnDismiss}
      />
    );

    const submitButton = screen.getByRole('button', { name: /auth.magicLink.sendLink/ });
    expect(submitButton).toBeDisabled();
  });

  describe('i18n keys resolve against real translations', () => {
    it('signup copy keys exist in the translation dictionary and are non-empty strings', () => {
      // Verify the keys are defined in the real translation dictionary, not just passed as strings
      const signupKeys = en.daily.results.signup;
      expect(signupKeys).toBeDefined();
      expect(signupKeys.shortPrompt).toBeDefined();
      expect(typeof signupKeys.shortPrompt).toBe('string');
      expect(signupKeys.shortPrompt.length).toBeGreaterThan(0);
    });
  });
});
