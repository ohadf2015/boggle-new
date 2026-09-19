/**
 * End-to-end wiring check (no mock on useAccountStreak itself): a signed-in
 * player must see the ACCOUNT/server daily streak, never the device-local
 * retention counter, even when the two disagree — this is the exact bug
 * reported (header flame "3" vs daily card "1" for the same account). A
 * guest with no account has only the device-local signal, so that's what
 * they see.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeTopBar } from '../HomeTopBar';
import type { ProfileData } from '@/contexts/auth/authTypes';

let mockAuth = { isAuthenticated: false, loading: false };
let mockChest = { loading: false, currentStreak: 0, cycleStart: '' };
let mockRetention = { streak: 0, best: 0, freezeAvailable: false };

vi.mock('@/components/AvatarLite', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar-lite-stub" />,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('@/hooks/useWeeklyChest', () => ({
  useWeeklyChest: () => mockChest,
}));

vi.mock('@/hooks/useRetentionStreak', () => ({
  useRetentionStreak: () => mockRetention,
}));

const t = (key: string, fallbackOrParams?: string | Record<string, string | number>) =>
  (typeof fallbackOrParams === 'string' ? fallbackOrParams : key);

describe('HomeTopBar streak pill — real useAccountStreak wiring', () => {
  beforeEach(() => {
    mockAuth = { isAuthenticated: false, loading: false };
    mockChest = { loading: false, currentStreak: 0, cycleStart: '' };
    mockRetention = { streak: 0, best: 0, freezeAvailable: false };
  });

  it('signed-in: renders the account/server streak, not the local retention streak', () => {
    mockAuth = { isAuthenticated: true, loading: false };
    mockChest = { loading: false, currentStreak: 1, cycleStart: '2026-09-15' };
    mockRetention = { streak: 3, best: 5, freezeAvailable: false };

    const profile = {
      id: 'u1', username: 'm', current_level: 5, total_xp: 0, total_coins: 0,
    } as unknown as ProfileData;
    render(<HomeTopBar profile={profile} language="en" t={t} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByText('3')).toBeNull();
  });

  it('guest: falls back to the device-local retention streak', () => {
    mockAuth = { isAuthenticated: false, loading: false };
    mockChest = { loading: false, currentStreak: 99, cycleStart: '2026-09-15' };
    mockRetention = { streak: 3, best: 5, freezeAvailable: false };

    render(<HomeTopBar profile={null} language="en" t={t} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByText('99')).toBeNull();
  });
});
