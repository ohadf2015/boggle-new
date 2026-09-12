/**
 * The student sub-pages must not bounce a signed-in student to the marketing home.
 *
 * `/student` already learned this: its guard waits for `user`, and there is a
 * test for the profile-still-loading window. `/student/achievements` and
 * `/student/profile` kept the older guard, which reads `isAuthenticated`:
 *
 *     const isAuthenticated = useMemo(() => !!user && !!profile, [user, profile]);
 *
 * `loading` tracks the SESSION, `profile` is a second round-trip that lands
 * later. So on a cold load of either sub-page there is a real window where
 * `loading === false`, `user` is set, and `profile` is still `null` — and the
 * guard reads that as "logged out" and pushes `/${language}`. Measured live at
 * 390x844 signed in as a student: a hard load of `/en/student/achievements` or
 * `/en/student/profile` landed on `/en` four times out of four, while the same
 * screens reached by tapping a link from `/student` (where `profile` is already
 * in the context) opened fine.
 *
 * Two of this repo's named pitfalls in one bug: a value with two sources that
 * resolve at different times (class 1), and two routes to the same state that
 * behave differently (class 3). The fix is the hub's own answer — a redirect
 * decides on `user`, which is the only thing that actually says "no session".
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const mockPush = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/en/student/achievements',
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/lib/supabase', () => ({ supabase: null }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="loader" /> }));
vi.mock('@/components/education/achievements/AchievementGrid', () => ({
  AchievementGrid: () => <div data-testid="grid" />,
}));
vi.mock('next/image', () => ({
  __esModule: true,
  default: (p: Record<string, unknown>) => React.createElement('img', p as never),
}));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import StudentAchievementsPageClient from '../achievements/PageClient';

/** A real session whose profile row has not come back yet. */
const SESSION_NO_PROFILE_YET = {
  user: { id: 'student-1' },
  profile: null,
  loading: false,
  // What `useComputedAuthValues` actually computes in this window.
  isAuthenticated: false,
};

describe('student sub-page auth guard — the profile lands after the session', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('does NOT send a signed-in student home while their profile is still in flight', async () => {
    mockUseAuth.mockReturnValue(SESSION_NO_PROFILE_YET);
    render(<StudentAchievementsPageClient />);
    // Give every effect a chance to fire — the redirect is in one of them.
    await waitFor(() => expect(mockPush).not.toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('still sends a visitor with no session at all home', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false, isAuthenticated: false });
    render(<StudentAchievementsPageClient />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/en'));
  });

  it('waits while the session itself is still loading', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: true, isAuthenticated: false });
    render(<StudentAchievementsPageClient />);
    await waitFor(() => expect(mockPush).not.toHaveBeenCalled());
  });
});

/**
 * Source-level companion: the two sub-pages must not reach for the derived
 * `isAuthenticated` at all. A behavioural test only covers the page it renders,
 * and `/student/profile` costs a full Supabase/duels harness to mount — but the
 * defect is a single identifier, and it is the identifier that is wrong.
 */
describe('neither sub-page decides a redirect on a profile-dependent flag', () => {
  const files = [
    'app/[locale]/student/achievements/PageClient.tsx',
    'app/[locale]/student/profile/PageClient.tsx',
  ];

  it.each(files)('%s guards on the session, not on isAuthenticated', async (rel) => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const src = readFileSync(path.resolve(__dirname, '..', '..', '..', '..', rel), 'utf8');
    // The destructure, the condition and the dep array — a comment naming the
    // flag is fine, reading it is not.
    expect(src).not.toMatch(/const \{[^}]*\bisAuthenticated\b[^}]*\} = useAuth\(\)/);
    expect(src).not.toMatch(/if \(!isAuthenticated\)/);
    expect(src).not.toMatch(/\[isAuthenticated,/);
  });
});
