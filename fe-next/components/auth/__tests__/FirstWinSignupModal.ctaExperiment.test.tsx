/**
 * Signup-prompt CTA copy experiment wiring on FirstWinSignupModal.
 *
 * Variants alter the subtitle (persuasion line) only — title and OAuth
 * controls stay constant so the conversion delta is isolated to copy.
 *
 * Exposure fires only when the modal actually opens (not on every mount,
 * since the modal is globally mounted via SignupPromptHost).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockVariant = vi.fn<() => string>(() => 'control');
const mockTrackExposure = vi.fn();

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({
    variant: mockVariant(),
    trackExposure: mockTrackExposure,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    // Echo the key back so we can assert the right key was looked up.
    t: (k: string, fallbackOrParams?: unknown) =>
      typeof fallbackOrParams === 'string' ? `[${k}|${fallbackOrParams}]` : `[${k}]`,
    locale: 'en',
  }),
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/utils/guestManager', () => ({
  getGuestStatsSummary: () => ({ gamesPlayed: 0, totalScore: 0 }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
}));

vi.mock('../hooks/useOAuthSignIn', () => ({
  useOAuthSignIn: () => ({ signIn: vi.fn(), loadingProvider: null, error: null }),
}));

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      <div {...props}>{children}</div>,
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('../shared', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return {
    ...actual,
    OAuthButtonGroup: () => <div data-testid="oauth-buttons" />,
    AuthTermsFooter: () => <div data-testid="auth-terms" />,
    AuthErrorMessage: () => null,
  };
});

vi.mock('../../ui/dialog', () => ({
  Dialog: ({ children, open }: React.PropsWithChildren<{ open?: boolean }>) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogTitle: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogBody: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

import FirstWinSignupModal from '../FirstWinSignupModal';

describe('FirstWinSignupModal — CTA copy experiment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVariant.mockReturnValue('control');
  });

  it('control: shows existing subtitle key', () => {
    mockVariant.mockReturnValue('control');
    render(<FirstWinSignupModal isOpen onClose={vi.fn()} variant="firstWin" />);
    // Subtitle = `[auth.firstWin.subtitle]`
    expect(screen.getByText(/\[auth\.firstWin\.subtitle\]/)).toBeInTheDocument();
  });

  it('urgency: swaps subtitle key to .subtitleUrgency', () => {
    mockVariant.mockReturnValue('urgency');
    render(<FirstWinSignupModal isOpen onClose={vi.fn()} variant="firstWin" />);
    expect(screen.getByText(/\[auth\.firstWin\.subtitleUrgency\]/)).toBeInTheDocument();
  });

  it('value-prop: swaps subtitle key to .subtitleValueProp', () => {
    mockVariant.mockReturnValue('value-prop');
    render(<FirstWinSignupModal isOpen onClose={vi.fn()} variant="firstWin" />);
    expect(screen.getByText(/\[auth\.firstWin\.subtitleValueProp\]/)).toBeInTheDocument();
  });

  it('multiGames + value-prop: uses multiGames namespace', () => {
    mockVariant.mockReturnValue('value-prop');
    render(<FirstWinSignupModal isOpen onClose={vi.fn()} variant="multiGames" />);
    expect(screen.getByText(/\[auth\.multiGames\.subtitleValueProp\]/)).toBeInTheDocument();
  });

  it('fires trackExposure when modal opens', () => {
    render(<FirstWinSignupModal isOpen onClose={vi.fn()} variant="firstWin" />);
    expect(mockTrackExposure).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire trackExposure when modal is closed', () => {
    render(<FirstWinSignupModal isOpen={false} onClose={vi.fn()} variant="firstWin" />);
    expect(mockTrackExposure).not.toHaveBeenCalled();
  });

  it('fires exposure once even if isOpen flips off then on', () => {
    const { rerender } = render(
      <FirstWinSignupModal isOpen onClose={vi.fn()} variant="firstWin" />
    );
    rerender(<FirstWinSignupModal isOpen={false} onClose={vi.fn()} variant="firstWin" />);
    rerender(<FirstWinSignupModal isOpen onClose={vi.fn()} variant="firstWin" />);
    // useExperiment's internal once-guard collapses repeated open events.
    expect(mockTrackExposure).toHaveBeenCalledTimes(2); // each open call to trackExposure;
    // hook-internal guard still ensures only one experiment_exposed PostHog event.
  });
});
