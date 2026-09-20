import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  DismissibleSignupLine,
  isSignupLineDismissedLocally,
  clearSignupLineDismissed,
} from '../DismissibleSignupLine';
import { en } from '@/translations/en';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key, // Return key itself if missing (will be visible in test failures)
    language: 'en',
  }),
}));

describe('DismissibleSignupLine', () => {
  beforeEach(() => {
    clearSignupLineDismissed();
    localStorage.clear();
  });

  describe('rendering', () => {
    it('renders when isVisible is true', () => {
      render(
        <DismissibleSignupLine
          isVisible
          onDismiss={vi.fn()}
          onOpenSignup={vi.fn()}
        />
      );

      expect(screen.getByText('daily.results.signup.shortPrompt')).toBeInTheDocument();
    });

    it('does not render when isVisible is false', () => {
      render(
        <DismissibleSignupLine
          isVisible={false}
          onDismiss={vi.fn()}
          onOpenSignup={vi.fn()}
        />
      );

      expect(screen.queryByText('daily.results.signup.shortPrompt')).not.toBeInTheDocument();
    });

    it('displays the prompt and subtitle text', () => {
      render(
        <DismissibleSignupLine
          isVisible
          onDismiss={vi.fn()}
          onOpenSignup={vi.fn()}
        />
      );

      expect(screen.getByText('daily.results.signup.shortPrompt')).toBeInTheDocument();
      expect(screen.getByText('daily.results.signup.shortSubtitle')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onOpenSignup when the prompt is clicked', () => {
      const onOpenSignup = vi.fn();
      render(
        <DismissibleSignupLine
          isVisible
          onDismiss={vi.fn()}
          onOpenSignup={onOpenSignup}
        />
      );

      const promptButton = screen.getByRole('button', { name: /daily.results.signup.title/i });
      fireEvent.click(promptButton);

      expect(onOpenSignup).toHaveBeenCalledOnce();
    });

    it('calls onDismiss when the X button is clicked', () => {
      const onDismiss = vi.fn();
      render(
        <DismissibleSignupLine
          isVisible
          onDismiss={onDismiss}
          onOpenSignup={vi.fn()}
        />
      );

      const dismissButton = screen.getByRole('button', { name: 'common.dismiss' });
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledOnce();
    });
  });

  describe('localStorage persistence', () => {
    it('marks as dismissed in localStorage when X is clicked', () => {
      const onDismiss = vi.fn();
      render(
        <DismissibleSignupLine
          isVisible
          onDismiss={onDismiss}
          onOpenSignup={vi.fn()}
        />
      );

      expect(isSignupLineDismissedLocally()).toBe(false);

      const dismissButton = screen.getByRole('button', { name: 'common.dismiss' });
      fireEvent.click(dismissButton);

      expect(isSignupLineDismissedLocally()).toBe(true);
    });

    it('isSignupLineDismissedLocally returns correct state', () => {
      expect(isSignupLineDismissedLocally()).toBe(false);

      localStorage.setItem('daily-signup-line-dismissed-v1', 'true');
      expect(isSignupLineDismissedLocally()).toBe(true);

      clearSignupLineDismissed();
      expect(isSignupLineDismissedLocally()).toBe(false);
    });
  });

  describe('i18n keys resolve against real translations', () => {
    it('shortPrompt and shortSubtitle keys exist in the translation dictionary', () => {
      // Verify the keys are defined in the real translation dictionary, not just passed as strings
      const signupKeys = en.daily.results.signup;
      expect(signupKeys).toBeDefined();
      expect(signupKeys.shortPrompt).toBeDefined();
      expect(signupKeys.shortSubtitle).toBeDefined();
      expect(typeof signupKeys.shortPrompt).toBe('string');
      expect(typeof signupKeys.shortSubtitle).toBe('string');
      expect(signupKeys.shortPrompt.length).toBeGreaterThan(0);
      expect(signupKeys.shortSubtitle.length).toBeGreaterThan(0);
    });
  });
});
