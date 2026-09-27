/**
 * The teacher profile page must not bounce a working teacher to the marketing home.
 *
 * This is the student sub-page bug (see `app/[locale]/student/__tests__/subpageGuard.test.tsx`)
 * on a surface that never got the fix. `/student`, `/student/achievements`,
 * `/student/profile`, `app/[locale]/admin/school-leads` and
 * `components/admin/AdminPageShell` all wait for `profile` before deciding a
 * role. `app/[locale]/teacher/profile/PageClient.tsx` still decided on
 * `useAuth().loading` alone:
 *
 *     if (loading) return;
 *     if (!isAuthenticated || !isTeacher) router.push(`/${language}`);
 *
 * `loading` tracks the SESSION. `isTeacher` reads `profile`, which is a second
 * round-trip. The two are not the same clock, and the gap is reachable:
 *
 *   - `useAuthInitialization.ts` forces `loading` false after 6s
 *     (LOADING_SAFETY_TIMEOUT_MS) and 1.5s after a tab returns
 *     (TAB_VISIBILITY_LOADING_TIMEOUT_MS), whether or not the profile landed.
 *   - `useCrossTabSync.ts` SESSION_REFRESHED calls `setUser()` and never
 *     `fetchUserData()`, so a second tab can hold `user` with `profile` null.
 *
 * TeacherGate does NOT cover that window — it makes it. Its `isLoading` is
 * `authLoading || reqLoading || profileLoading` where `profileLoading =
 * !!user && !profile`, so a null profile makes the gate "loading", and
 * `TeacherGate.tsx:122` (`isLoading && wasGranted`) deliberately keeps the
 * children MOUNTED for a teacher it has already granted — precisely so the
 * dashboard does not lose its state on every token refresh. The child's effect
 * then runs with `loading === false` and `profile === null` and pushes home.
 *
 * So the bug needs a teacher who was ALREADY working (granted) — which is why
 * it reads as "sometimes, mid-lesson" rather than a cold-load failure.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockPush = vi.fn();
const mockUseAuth = vi.fn();
const mockUseTeacherAccess = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush }),
  usePathname: () => '/en/teacher/profile',
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr', setLanguage: vi.fn() }),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({ classrooms: [], isLoading: false, error: null }),
}));
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => mockUseTeacherAccess(),
}));
vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));
vi.mock('@/components/teacher/SubscriptionStatusCard', () => ({
  __esModule: true,
  default: () => <div data-testid="subscription-card" />,
}));

import TeacherProfilePageClient from '../PageClient';
import { __resetTeacherGrantsForTests } from '@/components/education/TeacherGate';

const TEACHER = {
  id: 'teacher-1',
  display_name: 'Jane Smith',
  username: 'teacher_jane',
  avatar_emoji: '👩‍🏫',
  is_admin: false,
  user_role: 'teacher' as const,
};

/** The teacher, settled and working. This is what grants the gate. */
const SETTLED_TEACHER = {
  user: { id: 'teacher-1' },
  profile: TEACHER,
  loading: false,
  isAuthenticated: true,
};

/**
 * The race. A real session, `loading` already false, and the profile row
 * momentarily gone (token refresh / cross-tab SESSION_REFRESHED / the 6s
 * safety timeout firing before the profile landed).
 */
const PROFILE_IN_FLIGHT = {
  user: { id: 'teacher-1' },
  profile: null,
  loading: false,
  // What `useComputedAuthValues` actually computes in this window.
  isAuthenticated: false,
};

describe('teacher profile guard — the profile lands after the session', () => {
  beforeEach(() => {
    mockPush.mockClear();
    __resetTeacherGrantsForTests();
    mockUseTeacherAccess.mockReturnValue({
      hasAccess: true,
      status: 'approved',
      latestRequest: null,
      isLoading: false,
    });
  });

  it('does NOT send a working teacher home when their profile goes momentarily null', async () => {
    // 1. Settled render — the gate grants this teacher.
    mockUseAuth.mockReturnValue(SETTLED_TEACHER);
    const { rerender } = render(<TeacherProfilePageClient />);
    await waitFor(() => expect(mockPush).not.toHaveBeenCalled());

    // 2. The profile drops out. The gate reports "loading" and, because the
    //    teacher was granted, keeps the children mounted (TeacherGate.tsx:122).
    mockUseAuth.mockReturnValue(PROFILE_IN_FLIGHT);
    mockUseTeacherAccess.mockReturnValue({
      hasAccess: false,
      status: 'none',
      latestRequest: null,
      isLoading: true, // profileLoading = !!user && !profile
    });
    rerender(<TeacherProfilePageClient />);

    await waitFor(() => expect(mockPush).not.toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });

  /**
   * A settled signed-out visitor never reaches the inner component at all —
   * TeacherGate resolves first and owns that case, sending them to the access
   * page with a `?from=`. Asserting `/en` here would be asserting the bug: the
   * homepage is not where a logged-out teacher surface sends anyone.
   */
  it('lets TeacherGate send a settled signed-out visitor to the access page, not home', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      isAuthenticated: false,
    });
    mockUseTeacherAccess.mockReturnValue({
      hasAccess: false,
      status: 'none',
      latestRequest: null,
      isLoading: false,
    });
    render(<TeacherProfilePageClient />);
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith(
      '/en/education/access?from=%2Fen%2Fteacher%2Fprofile',
    );
    expect(mockPush).not.toHaveBeenCalledWith('/en');
  });

  it('waits while the session itself is still loading', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: true,
      isAuthenticated: false,
    });
    mockUseTeacherAccess.mockReturnValue({
      hasAccess: false,
      status: 'none',
      latestRequest: null,
      isLoading: true,
    });
    render(<TeacherProfilePageClient />);
    await waitFor(() => expect(mockPush).not.toHaveBeenCalled());
  });
});

/**
 * Source-level companion, mirroring the student convention test: the redirect
 * must not be decided on a profile-dependent flag. A behavioural test only
 * covers the states it is handed; the defect is a single identifier.
 */
describe('the teacher profile redirect does not decide on a profile-dependent flag', () => {
  it('guards on the session, not on isAuthenticated', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const src = readFileSync(
      path.resolve(__dirname, '..', 'PageClient.tsx'),
      'utf8',
    );
    // Primary: the flag must never be pulled out of the context. Asserting on
    // the condition alone would pin formatting — `if (!isTeacher ||
    // !isAuthenticated)` or different spacing slips past that. The destructure
    // cannot be written around. A comment naming the flag is fine (this file's
    // fix carries one); reading it is not.
    expect(src).not.toMatch(/const \{[^}]*\bisAuthenticated\b[^}]*\} = useAuth\(\)/);
    // ...and it must not reach the effect's dep array by any route.
    expect(src).not.toMatch(/\}, \[[^\]]*\bisAuthenticated\b[^\]]*\]\)/);
  });

  /**
   * Defense-in-depth: TeacherGate normally intercepts a settled signed-out
   * visitor before this inner component ever mounts (see the test above), so
   * this `if (!user)` branch is not reachable through the exported component
   * today. But it must never regress to the bare homepage if that invariant
   * ever changes — education homepage-bounce audit.
   */
  it('never pushes the bare main-app home on the !user branch', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const src = readFileSync(
      path.resolve(__dirname, '..', 'PageClient.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/if \(!user\) \{\s*router\.push\(`\/\$\{language\}`\)/);
  });
});
