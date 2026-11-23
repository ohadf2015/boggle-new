/**
 * ChallengeFriendCta — the add-friend moment at the challenge value peak.
 *
 * Regression guard for the viral dead-end: a challenge recipient must see a
 * one-tap way to keep the rivalry (add / accept / sign-in-to-add), and the
 * impression must be counted so the funnel is measurable.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChallengeFriendCta } from '../ChallengeFriendCta';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (k: string, params?: Record<string, string>) => (params ? `${k}:${params.name}` : k),
  }),
}));
const capture = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture } }));
vi.mock('@/components/results/ResultsFriendStatus', () => ({
  ResultsFriendStatusProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const ctx = vi.hoisted(() => ({
  value: null as null | {
    isAuthenticated: boolean;
    relationFor: (id: string) => string;
  },
}));
vi.mock('@/components/friends/FriendStatusContext', () => ({ useFriendStatus: () => ctx.value }));
const social = vi.hoisted(() => ({ tier: 'adult' as string }));
vi.mock('@/hooks/useSocialCapabilities', () => ({ useSocialCapabilities: () => ({ tier: social.tier }) }));

vi.mock('@/components/friends/FriendQuickAction', () => ({
  FriendQuickAction: ({ userId, name, surface }: { userId: string; name: string; surface: string }) => (
    <button data-testid="mock-friend-action" data-user={userId} data-surface={surface}>{name}</button>
  ),
}));
vi.mock('@/components/multiplayer/results/MpGuestAddChip', () => ({
  MpGuestAddPromptProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  MpRowFriendAction: ({ userId, surface }: { userId: string; surface: string }) => (
    <button data-testid="mock-guest-add" data-user={userId} data-surface={surface}>sign in</button>
  ),
}));

describe('ChallengeFriendCta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    social.tier = 'adult';
  });

  it('shows the one-tap add action to a signed-in recipient and counts the impression', () => {
    ctx.value = { isAuthenticated: true, relationFor: () => 'none' };
    render(<ChallengeFriendCta userId="u-challenger" name="Maya" />);
    expect(screen.getByTestId('challenge-friend-cta')).toBeInTheDocument();
    expect(screen.getByText('quickPlay.solo.addChallengerCta:Maya')).toBeInTheDocument();
    const action = screen.getByTestId('mock-friend-action');
    expect(action).toHaveAttribute('data-user', 'u-challenger');
    expect(action).toHaveAttribute('data-surface', 'quick_challenge_results');
    expect(capture).toHaveBeenCalledWith('challenge_friend_cta_shown', { surface: 'quick_challenge_results' });
  });

  it('offers guests the sign-in-to-add path instead of a dead end', () => {
    ctx.value = { isAuthenticated: false, relationFor: () => 'none' };
    render(<ChallengeFriendCta userId="u-challenger" name="Maya" />);
    expect(screen.getByTestId('mock-guest-add')).toHaveAttribute('data-user', 'u-challenger');
  });

  it('renders nothing when the challenge is the viewer\'s own, and the impression is not counted', () => {
    ctx.value = { isAuthenticated: true, relationFor: () => 'self' };
    const { container } = render(<ChallengeFriendCta userId="me" name="Me" />);
    expect(container).toBeEmptyDOMElement();
    expect(capture).not.toHaveBeenCalled();
  });

  it('renders nothing for child-tier players (Families Policy)', () => {
    social.tier = 'child';
    ctx.value = { isAuthenticated: false, relationFor: () => 'none' };
    const { container } = render(<ChallengeFriendCta userId="u-challenger" name="Maya" />);
    expect(container).toBeEmptyDOMElement();
    expect(capture).not.toHaveBeenCalled();
  });
});
