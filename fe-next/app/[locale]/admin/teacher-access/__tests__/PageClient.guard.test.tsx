// Regression guard for the teacher-access (and school-leads) admin-page bounce:
// AuthContext `loading` flips to false when the SESSION resolves, but `profile`
// is fetched asynchronously AFTER that. During that gap `profile` is null. The
// original guard `if (!loading && !profile?.is_admin) router.replace('/')` fired
// during this window — redirecting a real admin to home before is_admin was ever
// known, so the queue (and pending teacher requests) was never visible.
//
// The fix must NOT redirect while the profile is still loading (user present,
// profile null). It should only redirect once we know the user is not an admin.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he', setLanguage: vi.fn() }),
}));

// Heavy shell + queue children stubbed — this test is about the guard only.
vi.mock('@/components/Header', () => ({ default: () => <div data-testid="header" /> }));
vi.mock('@/components/admin/sidebar/AdminSidebar', () => ({ AdminSidebar: () => <div /> }));
vi.mock('@/components/admin/sidebar/AdminBottomNav', () => ({ AdminBottomNav: () => <div /> }));
vi.mock('@/components/admin/sidebar/AdminSubNav', () => ({ AdminSubNav: () => <div /> }));
vi.mock('@/components/admin/TeacherAccessQueue', () => ({
  TeacherAccessQueue: () => <div data-testid="queue">queue</div>,
}));
// Same reason as the queue: the funnel panel fetches on mount, and an unmocked
// fetch here rejects, blanks the whole render, and reads as a guard regression.
vi.mock('@/components/admin/TeacherFunnelPanel', () => ({
  TeacherFunnelPanel: () => <div data-testid="funnel" />,
}));

// Mutable auth state the tests flip between renders.
let authState: {
  user: { id: string } | null;
  profile: { is_admin?: boolean } | null;
  isAdmin: boolean;
  loading: boolean;
};
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

import { PageClient } from '../PageClient';

beforeEach(() => {
  replaceMock.mockClear();
  authState = { user: null, profile: null, isAdmin: false, loading: true };
});

describe('teacher-access PageClient admin guard', () => {
  it('does NOT redirect while the session is still loading', async () => {
    authState = { user: null, profile: null, isAdmin: false, loading: true };
    render(<PageClient />);
    await waitFor(() => {});
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('does NOT redirect during the profile-load gap (user present, profile null)', async () => {
    // The race: loading already false, but profile not yet fetched.
    authState = { user: { id: 'u1' }, profile: null, isAdmin: false, loading: false };
    render(<PageClient />);
    await waitFor(() => {});
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('redirects once we know a logged-in user is NOT an admin', async () => {
    authState = { user: { id: 'u1' }, profile: { is_admin: false }, isAdmin: false, loading: false };
    render(<PageClient />);
    // Locale-preserving bounce: a Hebrew visitor lands on /he, not / (English).
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/he'));
  });

  it('renders the queue for an admin without redirecting', async () => {
    authState = { user: { id: 'u1' }, profile: { is_admin: true }, isAdmin: true, loading: false };
    const { getByTestId } = render(<PageClient />);
    await waitFor(() => {});
    expect(replaceMock).not.toHaveBeenCalled();
    expect(getByTestId('queue')).toBeTruthy();
  });
});
