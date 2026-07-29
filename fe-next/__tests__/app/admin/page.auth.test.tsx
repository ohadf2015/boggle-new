import { vi, type Mock, } from 'vitest';
/**
 * @file Test for admin dashboard authentication
 * @description
 * Requirement: Admin dashboard must be accessible only by admin users
 * Verification: Check that non-admin users see "Access Required" message
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AdminPage from '@/app/[locale]/admin/page';
import { useAuth } from '@/contexts/AuthContext';
import { getSession } from '@/lib/supabase';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: vi.fn(() => '/en/admin'),
}));

vi.mock('@/lib/supabase', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    currentTrack: null,
    isPlaying: false,
    volume: 0.5,
    play: vi.fn(),
    pause: vi.fn(),
    setVolume: vi.fn(),
  }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound: vi.fn(),
    stopSound: vi.fn(),
    stopAllSounds: vi.fn(),
  }),
}));

vi.mock('@/contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({
    enabled: true,
    setEnabled: vi.fn(),
  }),
}));

// Mock all components to avoid deep rendering issues
vi.mock('@/components/Header', () => ({
  __esModule: true,
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('@/components/admin/LiveMonitor', () => ({
  LiveMonitor: () => <div data-testid="live-monitor">LiveMonitor</div>,
}));

vi.mock('@/components/admin/TodayGamesHistory', () => ({
  TodayGamesHistory: () => <div data-testid="games-history">GamesHistory</div>,
}));

vi.mock('@/components/admin/GamesDiagnostic', () => ({
  GamesDiagnostic: () => <div data-testid="games-diagnostic">GamesDiagnostic</div>,
}));

vi.mock('@/components/admin/EmailTestPanel', () => ({
  EmailTestPanel: () => <div data-testid="email-panel">EmailPanel</div>,
}));

vi.mock('@/components/ui/PullToRefreshWrapper', () => ({
  PullToRefreshWrapper: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/utils/mobileAccessibility', () => ({
  isMobileDevice: () => false,
}));

vi.mock('@/hooks/useRealtimeNotifications', () => ({
  useRealtimeNotifications: () => ({ notifications: [], unreadCount: 0 }),
}));

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
    removeChannel: vi.fn(),
  }),
}));


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('Admin Dashboard Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show "Access Required" for non-admin users', async () => {
    // GIVEN: User is authenticated but NOT admin

    useAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' },
      profile: { username: 'RegularUser' },
      isAdmin: false,
      loading: false,
    });

    // WHEN: Admin page is rendered
    render(<AdminPage />, { wrapper: createWrapper() });

    // THEN: Should show access denied message (lines 56-74 in page.tsx)
    await waitFor(() => {
      expect(screen.getByText('admin.accessRequired')).toBeInTheDocument();
      expect(screen.getByText('admin.accessDenied')).toBeInTheDocument();
    });
  });

  it('should show "Access Required" for unauthenticated users', async () => {
    // GIVEN: User is NOT authenticated

    useAuth.mockReturnValue({
      user: null,
      profile: null,
      isAdmin: false,
      loading: false,
    });

    // WHEN: Admin page is rendered
    render(<AdminPage />, { wrapper: createWrapper() });

    // THEN: Should show access denied message
    await waitFor(() => {
      expect(screen.getByText('admin.accessRequired')).toBeInTheDocument();
    });
  });

  it('should show loading state while checking authentication', () => {
    // GIVEN: Authentication is still loading

    useAuth.mockReturnValue({
      user: null,
      profile: null,
      isAdmin: false,
      loading: true,
    });

    // WHEN: Admin page is rendered
    render(<AdminPage />, { wrapper: createWrapper() });

    // THEN: Should show loading state (lines 77-83 in page.tsx)
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('should allow access for admin users', async () => {
    // GIVEN: User is authenticated AND admin

    useAuth.mockReturnValue({
      user: { id: 'admin-1', email: 'admin@example.com' },
      profile: { username: 'AdminUser' },
      isAdmin: true,
      loading: false,
    });


    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-token',
        },
      },
    });

    // WHEN: Admin page is rendered
    render(<AdminPage />, { wrapper: createWrapper() });

    // THEN: Should NOT show access denied (should show admin content)
    await waitFor(() => {
      expect(screen.queryByText('admin.accessRequired')).not.toBeInTheDocument();
    });
  });
});
