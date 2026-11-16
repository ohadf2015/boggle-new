import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: unknown) => (p && typeof p === 'object' ? `${k}|${JSON.stringify(p)}` : k), language: 'en' }),
}));
const auth = vi.hoisted(() => ({ value: { isAuthenticated: true, profile: { id: 'me' } as null | { id: string } } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'u-1' }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/useSafeBack', () => ({ useSafeBack: () => vi.fn() }));
vi.mock('@/components/Avatar', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('@/components/LevelBadge', () => ({ __esModule: true, default: () => <span /> }));
vi.mock('@/components/profile/XpByModeBreakdown', () => ({ XpByModeBreakdown: () => null }));
vi.mock('@/components/results/MmrChangeBadge', () => ({ RankBadge: () => null }));
vi.mock('@/components/friends/FriendQuickAction', () => ({
  FriendQuickAction: ({ userId }: { userId: string }) => <span data-testid="friend-action">{userId}</span>,
}));
vi.mock('@/components/friends/FriendStatusContext', () => ({
  FriendStatusProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFriendStatus: () => ({ relationFor: () => 'none' }),
}));
const share = vi.hoisted(() => vi.fn());
vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: share }));
const capture = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture } }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

import PlayerProfilePageClient from '../PageClient';

const PROFILE = {
  id: 'u-1', displayName: 'Dana', currentLevel: 9, percentile: 40, winRate: 50, totalGames: 10,
  totalScore: 100, totalWords: 50, longestWord: 'quiz', achievementCounts: { owl: 2, wordsmith: 1 },
  memberSince: '2026-01', xpByMode: {},
};

beforeEach(() => {
  auth.value = { isAuthenticated: true, profile: { id: 'me' } };
  share.mockReset();
  capture.mockReset();
  toast.success.mockReset();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => PROFILE })));
});
afterEach(() => vi.unstubAllGlobals());

describe('/player/[id] — challenge, friend, share', () => {
  it('Given another player, Then Challenge, the friend action and Share all show', async () => {
    render(<PlayerProfilePageClient />);
    const challenge = await screen.findByTestId('profile-challenge');
    expect(challenge).toHaveAttribute('href', '/en/multiplayer?autoCreate=true');
    expect(screen.getByTestId('friend-action')).toHaveTextContent('u-1');
    expect(screen.getByTestId('profile-share')).toBeInTheDocument();
  });

  it('Given my own profile, Then Share shows with my brag text and there is no Challenge or friend action', async () => {
    auth.value = { isAuthenticated: true, profile: { id: 'u-1' } };
    share.mockResolvedValue('copied');
    render(<PlayerProfilePageClient />);
    fireEvent.click(await screen.findByTestId('profile-share'));
    expect(screen.queryByTestId('profile-challenge')).toBeNull();
    expect(screen.queryByTestId('friend-action')).toBeNull();
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const arg = share.mock.calls[0][0];
    expect(arg.url).toBe(`${window.location.origin}/en/player/u-1`);
    expect(arg.text).toBe('brag2.profile.shareTextOwn|{"level":9,"achievements":3}');
    await waitFor(() => expect(capture).toHaveBeenCalledWith('brag_share_tapped', { surface: 'player_profile', kind: 'profile', result: 'copied' }));
    expect(toast.success).toHaveBeenCalledWith('profile.showcase.linkCopied');
  });

  it('Given someone else\'s profile, Then the share text never carries their name', async () => {
    share.mockResolvedValue('shared');
    render(<PlayerProfilePageClient />);
    fireEvent.click(await screen.findByTestId('profile-share'));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0][0].text).toBe('brag2.profile.shareTextOther');
    expect(JSON.stringify(share.mock.calls[0][0])).not.toContain('Dana');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('Given a guest viewer, Then Challenge and Share show but no friend action', async () => {
    auth.value = { isAuthenticated: false, profile: null };
    render(<PlayerProfilePageClient />);
    expect(await screen.findByTestId('profile-challenge')).toBeInTheDocument();
    expect(screen.getByTestId('profile-share')).toBeInTheDocument();
    expect(screen.queryByTestId('friend-action')).toBeNull();
  });
});
