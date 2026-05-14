/**
 * SignupToast — Tests
 *
 * Validates rendering, auto-dismiss, accessibility.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        let result = key;
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{${k}}`, String(v));
        }
        return result;
      }
      return key;
    },
  }),
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef(function MotionDiv({ children, ...props }: any, ref: any) {
      return <div ref={ref} {...props}>{children}</div>;
    }),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { SignupToast } from '../auth/SignupToast';

describe('SignupToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders when visible with game count', () => {
    render(
      <SignupToast isVisible={true} onDismiss={vi.fn()} mpGamesThisSession={3} />
    );

    // Toast message rendered (translation key returned by mock)
    expect(screen.getByText('auth.mpSignup.toastStreakWarning')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { container } = render(
      <SignupToast isVisible={false} onDismiss={vi.fn()} mpGamesThisSession={3} />
    );

    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('auto-dismisses after 4 seconds', () => {
    const onDismiss = vi.fn();
    render(
      <SignupToast isVisible={true} onDismiss={onDismiss} mpGamesThisSession={3} />
    );

    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(4000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('has accessible role=status with aria-live', () => {
    render(
      <SignupToast isVisible={true} onDismiss={vi.fn()} mpGamesThisSession={3} />
    );

    const toast = screen.getByRole('status');
    expect(toast.getAttribute('aria-live')).toBe('polite');
  });

  it('clears timer on unmount', () => {
    const onDismiss = vi.fn();
    const { unmount } = render(
      <SignupToast isVisible={true} onDismiss={onDismiss} mpGamesThisSession={3} />
    );

    unmount();
    vi.advanceTimersByTime(5000);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
