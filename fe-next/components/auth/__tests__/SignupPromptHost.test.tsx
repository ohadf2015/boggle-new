import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseAuth = vi.fn();
const mockUseSignupPrompt = vi.fn();
const mockUsePathname = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/components/singleplayer/results/hooks/useSignupPrompt', () => ({
  useSignupPrompt: (args: unknown) => mockUseSignupPrompt(args),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('next/dynamic', () => ({
  default: () => {
    const Stub = (props: { isOpen: boolean; variant?: string }) =>
      props.isOpen
        ? React.createElement(
            'div',
            { 'data-testid': 'first-win-signup-modal', 'data-variant': props.variant },
            'modal'
          )
        : null;
    return Stub;
  },
}));

import { SignupPromptHost } from '../SignupPromptHost';

describe('SignupPromptHost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSignupPrompt.mockReturnValue({ showSignupModal: false, setShowSignupModal: vi.fn(), isFirstWin: false });
    mockUsePathname.mockReturnValue('/he');
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null, loading: false });
  });

  it('renders nothing when hook says not to show', () => {
    render(<SignupPromptHost />);
    expect(screen.queryByTestId('first-win-signup-modal')).toBeNull();
  });

  it('renders modal when guest hook signals show', () => {
    mockUseSignupPrompt.mockReturnValue({ showSignupModal: true, setShowSignupModal: vi.fn(), isFirstWin: false });
    render(<SignupPromptHost />);
    expect(screen.getByTestId('first-win-signup-modal')).toBeInTheDocument();
  });

  it('uses the firstWin celebration variant when the hook flags a first win', () => {
    // Regression: the host used to hardcode variant="multiGames", so the
    // hook's isFirstWin was computed but never consumed — first-time winners
    // (the prompt's largest population) got generic copy and no confetti.
    mockUseSignupPrompt.mockReturnValue({ showSignupModal: true, setShowSignupModal: vi.fn(), isFirstWin: true });
    render(<SignupPromptHost />);
    expect(screen.getByTestId('first-win-signup-modal')).toHaveAttribute('data-variant', 'firstWin');
  });

  it('keeps the multiGames variant for non-first-win prompts', () => {
    mockUseSignupPrompt.mockReturnValue({ showSignupModal: true, setShowSignupModal: vi.fn(), isFirstWin: false });
    render(<SignupPromptHost />);
    expect(screen.getByTestId('first-win-signup-modal')).toHaveAttribute('data-variant', 'multiGames');
  });

  it('disables hook on multiplayer routes (delegated to useMultiplayerSignupNudge)', () => {
    mockUsePathname.mockReturnValue('/he/multiplayer');
    render(<SignupPromptHost />);
    const args = mockUseSignupPrompt.mock.calls[0]?.[0] as { disabled?: boolean };
    expect(args?.disabled).toBe(true);
  });

  it('does not disable hook on non-multiplayer routes', () => {
    mockUsePathname.mockReturnValue('/he/blast');
    render(<SignupPromptHost />);
    const args = mockUseSignupPrompt.mock.calls[0]?.[0] as { disabled?: boolean };
    expect(args?.disabled).toBe(false);
  });

  it('passes auth state through to hook', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'u1' }, loading: false });
    render(<SignupPromptHost />);
    const args = mockUseSignupPrompt.mock.calls[0]?.[0] as {
      isAuthenticated: boolean;
      hasUser: boolean;
      authLoading: boolean;
    };
    expect(args.isAuthenticated).toBe(true);
    expect(args.hasUser).toBe(true);
    expect(args.authLoading).toBe(false);
  });
});
