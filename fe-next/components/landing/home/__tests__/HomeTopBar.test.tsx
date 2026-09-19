import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { HomeTopBar } from '../HomeTopBar';
import type { ProfileData } from '@/contexts/auth/authTypes';
import { useRetentionStreak } from '@/hooks/useRetentionStreak';

// AvatarLite is the pre-mount / guest / error fallback disc — stub so we can
// assert the cheap path without depending on palette hashing.
vi.mock('@/components/AvatarLite', () => ({
  __esModule: true,
  default: (props: { userId?: string; customAvatar?: unknown }) => (
    <div
      data-testid="avatar-lite-stub"
      data-user-id={props.userId ?? ''}
      data-has-custom={props.customAvatar ? 'true' : 'false'}
    />
  ),
}));

vi.mock('@/hooks/useRetentionStreak', () => ({
  useRetentionStreak: vi.fn(() => ({ streak: 0, best: 0, freezeAvailable: false })),
}));

// Simple interpolating t — substitutes {param} tokens so we can assert real
// output, and honours a string fallback as the 2nd arg (matches the real `t`).
const t = (
  key: string,
  fallbackOrParams?: string | Record<string, string | number>,
  paramsArg?: Record<string, string | number>,
) => {
  const dict: Record<string, string> = {
    'common.player': 'Player',
    'nav.profile': 'Profile',
    'landing.home.greeting': 'Hey, {name}',
    'landing.home.levelTitle': 'Level {level} · {title}',
    'landing.home.levelOnly': 'Level {level}',
    'landing.home.titles.LEXICON_KING': 'Lexicon King',
  };
  const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
  const params =
    typeof fallbackOrParams === 'object' && fallbackOrParams !== null ? fallbackOrParams : paramsArg;
  let s = dict[key] ?? fallback ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
  return s;
};

describe('HomeTopBar', () => {
  beforeEach(() => {
    vi.mocked(useRetentionStreak).mockReturnValue({
      streak: 0,
      best: 0,
      freezeAvailable: false,
    });
  });

  it('renders real name, level and coins from the profile', () => {
    const profile = {
      id: 'u1',
      username: 'm-fallback',
      display_name: 'Maya',
      current_level: 7,
      total_xp: 0,
      total_coins: 2840,
    } as unknown as ProfileData;

    vi.mocked(useRetentionStreak).mockReturnValue({
      streak: 12,
      best: 12,
      freezeAvailable: false,
    });
    render(<HomeTopBar profile={profile} language="en" t={t} />);

    expect(screen.getByText('Hey, Maya')).toBeInTheDocument();
    expect(screen.getByText('2,840')).toBeInTheDocument(); // localized coins
    expect(screen.getByText('12')).toBeInTheDocument(); // streak
    // level badge shows the persisted level
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('localizes the level title rather than leaking the raw constant key', () => {
    const profile = {
      id: 'u1',
      username: 'fish',
      display_name: 'Fish',
      current_level: 76,
      total_xp: 0,
      total_coins: 0,
    } as unknown as ProfileData;

    render(<HomeTopBar profile={profile} language="he" t={t} />);

    // Level 76 maps to LEXICON_KING — must render the translated label, never the key.
    expect(screen.getByText('Level 76 · Lexicon King')).toBeInTheDocument();
    expect(screen.queryByText(/LEXICON_KING/)).toBeNull();
  });

  it('links the avatar/greeting to the locale-aware profile page', () => {
    const profile = {
      id: 'u1',
      username: 'fish',
      display_name: 'Fish',
      current_level: 7,
      total_xp: 0,
      total_coins: 0,
    } as unknown as ProfileData;

    render(<HomeTopBar profile={profile} language="he" t={t} />);

    const link = screen.getByRole('link', { name: 'Profile' });
    expect(link).toHaveAttribute('href', '/he/profile');
  });

  it('degrades gracefully with a null profile — never "undefined" / no crash', () => {
    render(<HomeTopBar profile={null} language="en" t={t} />);
    // falls back to the translated player noun, level 1, zero coins
    expect(screen.getByText('Hey, Player')).toBeInTheDocument();
    // streak "0" + coins "0" both render
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
    // XP-derived level when none persisted
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).toBeNull();
  });

  it('assigns a random generated avatar (seed) to a new player with no profile id', () => {
    render(<HomeTopBar profile={null} language="en" t={t} />);
    // No skeleton avatar — the stub receives a non-empty seed → generated avatar.
    const avatar = screen.getByTestId('avatar-lite-stub');
    expect(avatar.getAttribute('data-user-id')).not.toBe('');
    expect(avatar.getAttribute('data-has-custom')).toBe('false');
  });

  it('uses the real profile id as the avatar source when a profile is present', () => {
    const profile = { id: 'real-id', username: 'x', total_xp: 0, total_coins: 0 } as unknown as ProfileData;
    render(<HomeTopBar profile={profile} language="en" t={t} />);
    expect(screen.getByTestId('home-avatar-png')).toHaveAttribute('src', '/api/avatar/png/real-id');
  });

  it('shows loading skeletons (not values) for name/coins while the profile is loading', () => {
    const profile = {
      id: 'u1', username: 'm', display_name: 'Maya', current_level: 7, total_xp: 0, total_coins: 2840,
    } as unknown as ProfileData;
    vi.mocked(useRetentionStreak).mockReturnValue({
      streak: 12,
      best: 12,
      freezeAvailable: false,
    });
    render(<HomeTopBar profile={profile} language="en" t={t} profileLoading />);

    // Profile-derived values are withheld behind skeletons while auth loads.
    expect(screen.queryByText('Hey, Maya')).toBeNull();
    expect(screen.queryByText('2,840')).toBeNull();
    // Retention streak is independent of profile loading — pill shows once mounted.
    expect(screen.getByText('12')).toBeInTheDocument();
    // Skeleton placeholders are present (NeoSkeleton uses role="status").
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(1);
    // The avatar still renders (never skeletoned) — the real face via PNG even
    // while the profile values sit behind skeletons.
    expect(screen.getByTestId('home-avatar-png')).toHaveAttribute('src', '/api/avatar/png/u1');
  });

  it('streak pill renders the retention streak from useRetentionStreak', () => {
    const profile = {
      id: 'u1', username: 'm', display_name: 'Maya', current_level: 7, total_xp: 0, total_coins: 2840,
    } as unknown as ProfileData;
    vi.mocked(useRetentionStreak).mockReturnValue({
      streak: 3,
      best: 5,
      freezeAvailable: false,
    });
    render(<HomeTopBar profile={profile} language="en" t={t} />);

    expect(screen.getByText('Hey, Maya')).toBeInTheDocument();
    expect(screen.getByText('2,840')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('HomeTopBar streak pill and StreakBadge both read useRetentionStreak', () => {
    const topBar = readFileSync(path.resolve(__dirname, '../HomeTopBar.tsx'), 'utf8');
    const badge = readFileSync(path.resolve(__dirname, '../../../StreakBadge.tsx'), 'utf8');
    const hub = readFileSync(path.resolve(__dirname, '../HomeHub.tsx'), 'utf8');
    expect(topBar).toMatch(/from '@\/hooks\/useRetentionStreak'/);
    expect(badge).toMatch(/from '@\/hooks\/useRetentionStreak'/);
    expect(hub).not.toMatch(/streak=\{dailyChallengeStats/);
    expect(hub).not.toMatch(/streakLoading=/);
  });

  it('renders the real avatar face via the server-rendered PNG once mounted', () => {
    const profile = { id: 'u1', username: 'm', total_xp: 0, total_coins: 0 } as unknown as ProfileData;
    render(<HomeTopBar profile={profile} language="en" t={t} />);

    // Post-mount an authed player gets their actual face from /api/avatar/png…
    expect(screen.getByTestId('home-avatar-png')).toHaveAttribute('src', '/api/avatar/png/u1');
    // …not the permanent empty disc (user-reported: avatar invisible).
    expect(screen.queryByTestId('avatar-lite-stub')).toBeNull();
  });

  it('falls back to the AvatarLite disc when the PNG fails to load', () => {
    const profile = { id: 'u1', username: 'm', total_xp: 0, total_coins: 0 } as unknown as ProfileData;
    render(<HomeTopBar profile={profile} language="en" t={t} />);

    fireEvent.error(screen.getByTestId('home-avatar-png'));
    expect(screen.getByTestId('avatar-lite-stub')).toBeInTheDocument();
  });

  it('keeps guests on the AvatarLite disc (no UUID to render server-side)', () => {
    render(<HomeTopBar profile={null} language="en" t={t} />);
    expect(screen.getByTestId('avatar-lite-stub').getAttribute('data-user-id')).not.toBe('');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('stays off the client avatar part library — server PNG only (source)', () => {
    const src = readFileSync(path.resolve(__dirname, '../HomeTopBar.tsx'), 'utf8');
    // The face comes from the server-rendered PNG route…
    expect(src).toMatch(/\/api\/avatar\/png\/\$\{p\.id\}/);
    // …never from Avatar.tsx / AvatarRenderer — those pull the 477 KiB part
    // library onto the landing first-paint graph (LandingView.bundleGraph guard).
    expect(src).not.toMatch(/from '@\/components\/Avatar'/);
    expect(src).not.toMatch(/from '@\/components\/avatar\//);
    // Cheap disc remains for the pre-mount / guest / error frame.
    expect(src).toMatch(/\{mounted && p\?\.id && !avatarImgErrored \? \(/);
    expect(src).toMatch(/<AvatarLite/);
  });
});
