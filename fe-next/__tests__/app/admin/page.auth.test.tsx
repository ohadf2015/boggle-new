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

jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    currentTrack: null,
    isPlaying: false,
    volume: 0.5,
    play: jest.fn(),
    pause: jest.fn(),
    setVolume: jest.fn(),
  }),
}));

jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound: jest.fn(),
    stopSound: jest.fn(),
    stopAllSounds: jest.fn(),
  }),
}));

jest.mock('@/contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({
    enabled: true,
    setEnabled: jest.fn(),
  }),
}));

// Mock all components to avoid deep rendering issues
jest.mock('@/components/Header', () => ({
  __esModule: true,
  default: () => <div data-testid="header">Header</div>,
}));

jest.mock('@/components/admin/LiveMonitor', () => ({
  LiveMonitor: () => <div data-testid="live-monitor">LiveMonitor</div>,
}));

jest.mock('@/components/admin/TodayGamesHistory', () => ({
  TodayGamesHistory: () => <div data-testid="games-history">GamesHistory</div>,
}));

jest.mock('@/components/admin/GamesDiagnostic', () => ({
  GamesDiagnostic: () => <div data-testid="games-diagnostic">GamesDiagnostic</div>,
}));

jest.mock('@/components/admin/EmailTestPanel', () => ({
  EmailTestPanel: () => <div data-testid="email-panel">EmailPanel</div>,
}));

jest.mock('@/components/ui/PullToRefreshWrapper', () => ({
  PullToRefreshWrapper: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/utils/mobileAccessibility', () => ({
  isMobileDevice: () => false,
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
