/**
 * MultiplayerSignupSheet — Tests
 *
 * Validates rendering, stats display, dismiss behavior, OAuth wiring.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock dependencies
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

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

const mockSignIn = vi.fn();
vi.mock('../auth/hooks/useOAuthSignIn', () => ({
  useOAuthSignIn: () => ({
    signIn: mockSignIn,
    loadingProvider: null,
    error: null,
  }),
}));

vi.mock('../auth/shared', () => ({
  OAuthButtonGroup: ({ onSignIn }: { onSignIn: (p: string) => void }) => (
    <button data-testid="oauth-group" onClick={() => onSignIn('google')}>
      Sign in
    </button>
  ),
}));

// Mock framer-motion to render without animation
vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef(function MotionDiv({ children, ...props }: any, ref: any) {
      return <div ref={ref} {...props}>{children}</div>;
    }),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { MultiplayerSignupSheet } from '../auth/MultiplayerSignupSheet';

const defaultStats = {
  mpGamesThisSession: 3,
  totalWords: 84,
  totalScore: 350,
  totalGames: 5,
};

describe('MultiplayerSignupSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open with stats', () => {
    render(
      <MultiplayerSignupSheet isOpen={true} onClose={vi.fn()} stats={defaultStats} />
    );

    // Should render the stats-at-risk and title translation keys
    expect(screen.getByText('auth.mpSignup.statsAtRisk')).toBeTruthy();
    expect(screen.getByText('auth.mpSignup.title')).toBeTruthy();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <MultiplayerSignupSheet isOpen={false} onClose={vi.fn()} stats={defaultStats} />
    );

    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('calls onClose when dismiss button clicked', () => {
    const onClose = vi.fn();
    render(
      <MultiplayerSignupSheet isOpen={true} onClose={onClose} stats={defaultStats} />
    );

    // "Maybe Later" button
    const laterBtn = screen.getByText('auth.firstWin.maybeLater');
    fireEvent.click(laterBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button clicked', () => {
    const onClose = vi.fn();
    render(
      <MultiplayerSignupSheet isOpen={true} onClose={onClose} stats={defaultStats} />
    );

    const closeBtn = screen.getByLabelText('common.close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders OAuth buttons', () => {
    render(
      <MultiplayerSignupSheet isOpen={true} onClose={vi.fn()} stats={defaultStats} />
    );

    expect(screen.getByTestId('oauth-group')).toBeTruthy();
  });

  it('has proper accessibility role', () => {
    render(
      <MultiplayerSignupSheet isOpen={true} onClose={vi.fn()} stats={defaultStats} />
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('sits above the sticky ready bar using the measured bottomOffset', () => {
    render(
      <MultiplayerSignupSheet
        isOpen={true}
        onClose={vi.fn()}
        stats={defaultStats}
        bottomOffset={150}
      />
    );

    // Sheet must clear the fixed sticky bar — bottom = offset + gap (8px).
    const dialog = screen.getByRole('dialog');
    expect(dialog.style.bottom).toBe('158px');
  });

  it('falls back to a CSS-class offset before the bar height is measured', () => {
    render(
      <MultiplayerSignupSheet
        isOpen={true}
        onClose={vi.fn()}
        stats={defaultStats}
        bottomOffset={0}
      />
    );

    // No inline bottom → Tailwind fallback class governs the pre-measure frame.
    const dialog = screen.getByRole('dialog');
    expect(dialog.style.bottom).toBe('');
  });
});
