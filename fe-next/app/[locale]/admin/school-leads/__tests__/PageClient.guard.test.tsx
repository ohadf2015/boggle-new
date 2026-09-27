// Same profile-load-gap regression as teacher-access: the admin guard must not
// bounce a real admin to home during the window where the session has resolved
// (loading=false) but the profile is still being fetched (profile=null).

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

vi.mock('@/components/Header', () => ({ default: () => <div data-testid="header" /> }));
vi.mock('@/components/admin/sidebar/AdminSidebar', () => ({ AdminSidebar: () => <div /> }));
vi.mock('@/components/admin/sidebar/AdminBottomNav', () => ({ AdminBottomNav: () => <div /> }));
vi.mock('@/components/admin/sidebar/AdminSubNav', () => ({ AdminSubNav: () => <div /> }));
vi.mock('@/components/admin/SchoolLeadsQueue', () => ({
  SchoolLeadsQueue: () => <div data-testid="queue">queue</div>,
}));

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

describe('school-leads PageClient admin guard', () => {
  it('does NOT redirect while the session is still loading', async () => {
    authState = { user: null, profile: null, isAdmin: false, loading: true };
    render(<PageClient />);
    await waitFor(() => {});
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('does NOT redirect during the profile-load gap (user present, profile null)', async () => {
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
