/**
 * @file Test for admin dashboard authentication
 * @description
 * Requirement: Admin dashboard must be accessible only by admin users
 * Verification: Check that non-admin users see "Access Required" message
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AdminPage from '@/app/[locale]/admin/page';

// Mock dependencies
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/lib/supabase', () => ({
  getSession: jest.fn(),
}));

describe('Admin Dashboard Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show "Access Required" for non-admin users', async () => {
    // GIVEN: User is authenticated but NOT admin
    const { useAuth } = require('@/contexts/AuthContext');
    useAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { username: 'RegularUser' },
      isAdmin: false,
      loading: false,
    });

    // WHEN: Admin page is rendered
    render(<AdminPage />);

    // THEN: Should show access denied message (lines 56-74 in page.tsx)
    await waitFor(() => {
      expect(screen.getByText('admin.accessRequired')).toBeInTheDocument();
      expect(screen.getByText('admin.accessDenied')).toBeInTheDocument();
    });
  });

  it('should show "Access Required" for unauthenticated users', async () => {
    // GIVEN: User is NOT authenticated
    const { useAuth } = require('@/contexts/AuthContext');
    useAuth.mockReturnValue({
      user: null,
      profile: null,
      isAdmin: false,
      loading: false,
    });

    // WHEN: Admin page is rendered
    render(<AdminPage />);

    // THEN: Should show access denied message
    await waitFor(() => {
      expect(screen.getByText('admin.accessRequired')).toBeInTheDocument();
    });
  });

  it('should show loading state while checking authentication', () => {
    // GIVEN: Authentication is still loading
    const { useAuth } = require('@/contexts/AuthContext');
    useAuth.mockReturnValue({
      user: null,
      profile: null,
      isAdmin: false,
      loading: true,
    });

    // WHEN: Admin page is rendered
    render(<AdminPage />);

    // THEN: Should show loading state (lines 77-83 in page.tsx)
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('should allow access for admin users', async () => {
    // GIVEN: User is authenticated AND admin
    const { useAuth } = require('@/contexts/AuthContext');
    useAuth.mockReturnValue({
      user: { id: 'admin-1', email: 'admin@example.com' },
      profile: { username: 'AdminUser' },
      isAdmin: true,
      loading: false,
    });

    const { getSession } = require('@/lib/supabase');
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-token',
        },
      },
    });

    // WHEN: Admin page is rendered
    render(<AdminPage />);

    // THEN: Should NOT show access denied (should show admin content)
    await waitFor(() => {
      expect(screen.queryByText('admin.accessRequired')).not.toBeInTheDocument();
    });
  });
});
