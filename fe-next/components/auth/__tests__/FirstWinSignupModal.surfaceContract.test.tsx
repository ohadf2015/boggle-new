/**
 * t_da22db9a — FirstWinSignupModal surface contract.
 *
 * jsdom cannot compute z-index stacking, so these are source-shape tests:
 * they assert the RENDERED sheet testid is present and the useOAuthSignIn
 * options wiring (analyticsSource = `<variant>_<surface>`) plus, read from
 * the component source, the sheet stacking context sitting ABOVE the z-90
 * results-dialog overlay.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const mockUseOAuthSignIn = vi.fn();
vi.mock('../hooks/useOAuthSignIn', () => ({
  useOAuthSignIn: (opts: unknown) => {
    mockUseOAuthSignIn(opts);
    return { signIn: vi.fn(), loadingProvider: null, error: null };
  },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
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
  DialogContent: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  ),
  DialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogTitle: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogBody: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

vi.mock('../../ui/Reveal', () => ({
  Reveal: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import FirstWinSignupModal from '../FirstWinSignupModal';

describe('FirstWinSignupModal — surface contract (t_da22db9a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the bottom sheet with the sheet testid and reports first_win_sheet', () => {
    const { container } = render(
      <FirstWinSignupModal
        isOpen
        onClose={vi.fn()}
        isFirstWin
        variant="firstWin"
        surface="sheet"
      />
    );

    expect(container.querySelector('[data-testid="first-win-signup-sheet"]')).not.toBeNull();
    expect(mockUseOAuthSignIn).toHaveBeenCalledWith(
      expect.objectContaining({ analyticsSource: 'first_win_sheet' })
    );
  });

  it('reports multi_games_dialog for the multiGames variant on the dialog surface', () => {
    const { container } = render(
      <FirstWinSignupModal
        isOpen
        onClose={vi.fn()}
        isFirstWin={false}
        variant="multiGames"
        surface="dialog"
      />
    );

    expect(container.querySelector('[data-testid="first-win-signup-modal"]')).not.toBeNull();
    expect(mockUseOAuthSignIn).toHaveBeenCalledWith(
      expect.objectContaining({ analyticsSource: 'multi_games_dialog' })
    );
  });

  it('sheet stacking context sits above the z-90 results-dialog overlay (source shape)', () => {
    // Regression shape: the sheet used `z-50` and rendered UNDER the z-90
    // results overlay — invisible chrome whose buttons can never be tapped
    // (PostHog 14d: 0/117 mp/first-win sheet conversions).
    const src = readFileSync(
      join(__dirname, '..', 'FirstWinSignupModal.tsx'),
      'utf8'
    );
    expect(src).toContain('z-[95]');
    expect(src).not.toContain('bottom-3 z-50');
  });
});
