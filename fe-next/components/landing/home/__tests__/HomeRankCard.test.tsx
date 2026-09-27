import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ProfileData } from '@/contexts/auth/authTypes';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// getUserRank hits supabase — stub it to a resolved promise so the effect is inert.
vi.mock('@/lib/supabase', () => ({
  getUserRank: vi.fn().mockResolvedValue({ data: null }),
}));

import { HomeRankCard } from '../HomeRankCard';

const t = (key: string, params?: Record<string, string | number>) => {
  let s = key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
  return s;
};

const authedProfile = {
  id: 'u1',
  current_level: 12,
  total_xp: 5000,
} as unknown as ProfileData;

describe('HomeRankCard', () => {
  beforeEach(() => mockUseAuth.mockReset());

  it('shows a skeleton for the level/XP region — never a stale level 1 — while auth is still resolving', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, profile: null, loading: true });
    render(<HomeRankCard playerAllTimeBest={null} t={t} />);
    // Skeleton present, and the misleading default tier label must NOT be shown yet.
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('landing.home.tier.rookie')).not.toBeInTheDocument();
  });

  it('renders the real level/tier once auth resolves (no skeleton)', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, profile: authedProfile, loading: false });
    render(<HomeRankCard playerAllTimeBest={{ score: 999 }} t={t} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    // best-score line renders its real value (kept as a pop-in, not skeletoned)
    expect(screen.getByText('999')).toBeInTheDocument();
  });

  it('does NOT pin a resolved guest to a skeleton (guest is not loading)', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, profile: null, loading: false });
    render(<HomeRankCard playerAllTimeBest={null} t={t} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
