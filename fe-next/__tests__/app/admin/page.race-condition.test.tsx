/**
 * Admin Page - Race Condition Test
 *
 * Tests for race conditions in authentication visibility and admin dashboard access.
 *
 * BUG SCENARIO:
 * User authenticates → authLoading becomes false → profile is still null →
 * isAdmin is false (because profile is null) → Access Denied shown →
 * Then profile loads → isAdmin becomes true → but user already saw Access Denied
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminPage from '@/app/[locale]/admin/page';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/supabase';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/LanguageContext');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/lib/supabase', () => ({
  getSession: jest.fn(),
}));

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
jest.mock('@/components/Header', () => {
  return function MockHeader() {
    return <div data-testid="mock-header">Header</div>;
  };
});
jest.mock('@/components/admin/LiveMonitor', () => {
  return {
    LiveMonitor: function MockLiveMonitor() {
      return <div data-testid="mock-live-monitor">LiveMonitor</div>;
    },
  };
});
jest.mock('@/components/admin/TodayGamesHistory', () => {
  return {
    TodayGamesHistory: function MockTodayGamesHistory() {
      return <div data-testid="mock-today-games">TodayGamesHistory</div>;
    },
  };
});
jest.mock('@/components/admin/GamesDiagnostic', () => {
  return {
    GamesDiagnostic: function MockGamesDiagnostic() {
      return <div data-testid="mock-games-diagnostic">GamesDiagnostic</div>;
    },
  };
});
jest.mock('@/components/admin/EmailTestPanel', () => {
  return {
    EmailTestPanel: function MockEmailTestPanel() {
      return <div data-testid="mock-email-test">EmailTestPanel</div>;
    },
  };
});
jest.mock('@/utils/mobileAccessibility', () => ({
  isMobileDevice: jest.fn(() => false),
}));
jest.mock('@/components/ui/PullToRefreshWrapper', () => {
  return {
    PullToRefreshWrapper: function MockPullToRefreshWrapper({ children }: any) {
      return <div data-testid="mock-pull-to-refresh">{children}</div>;
    },
  };
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('AdminPage - Race Condition Tests', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  const mockLanguageContext = {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'admin.accessRequired': 'Admin Access Required',
        'admin.accessDenied': 'You need administrator privileges to access this page.',
        'admin.dashboard': 'Admin Dashboard',
        'admin.welcome': 'Welcome,',
        'admin.loadingDashboard': 'Loading dashboard...',
        'admin.preparingTools': 'Preparing admin tools...',
        'common.loading': 'Loading...',
        'common.backToHome': 'Back to Home',
        'common.back': 'Back',
      };
      return translations[key] || key;
    },
    language: 'en' as const,
    setLanguage: jest.fn(),
    dir: 'ltr' as const,
    currentFlag: '🇺🇸',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseRouter.mockReturnValue(mockRouter as any);
    mockUseLanguage.mockReturnValue(mockLanguageContext);
    // Default mock for getSession (returns valid token immediately)
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token-123' } },
      error: null,
    } as any);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Race Condition: Auth loads before Profile', () => {
    test('SHOULD show loading state when user exists but profile is null', () => {
      // GIVEN: User authenticated but profile not yet loaded (race condition scenario)
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'admin@test.com' } as any,
        profile: null, // Profile not yet loaded
        isAdmin: false, // False because profile is null
        loading: false, // Auth loading complete
        isAuthenticated: true,
        isGuest: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        rankedProgress: null,
        isSupabaseEnabled: true,
        setupProfile: jest.fn(),
        updateProfile: jest.fn(),
        refreshProfile: jest.fn(),
      });

      // WHEN: Admin page renders
      render(<AdminPage />);

      // THEN: Should show loading state (NOT access denied)
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Admin Access Required')).not.toBeInTheDocument();
    });

    test('SHOULD NOT show access denied during profile loading', () => {
      // GIVEN: User authenticated, authLoading=false, but profile still loading
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'admin@test.com' } as any,
        profile: null, // Profile loading
        isAdmin: false, // False because profile is null
        loading: false, // Auth check complete
        isAuthenticated: true,
        isGuest: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        rankedProgress: null,
        isSupabaseEnabled: true,
        setupProfile: jest.fn(),
        updateProfile: jest.fn(),
        refreshProfile: jest.fn(),
      });

      // WHEN: Admin page renders
      render(<AdminPage />);

      // THEN: Should NOT show access denied (should show loading instead)
      expect(screen.queryByText('Admin Access Required')).not.toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('SHOULD show admin dashboard after profile loads with admin=true', async () => {
      // GIVEN: Initial state - user exists, profile loading
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'admin@test.com' } as any,
        profile: null,
        isAdmin: false,
        loading: false,
        isAuthenticated: true,
        isGuest: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        rankedProgress: null,
        isSupabaseEnabled: true,
        setupProfile: jest.fn(),
        updateProfile: jest.fn(),
        refreshProfile: jest.fn(),
      });

      const { rerender } = render(<AdminPage />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // WHEN: Profile loads with admin privileges
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'admin@test.com' } as any,
        profile: {
          id: 'user-1',
          username: 'admin',
          display_name: 'Admin User',
          is_admin: true, // NOW admin is true
          total_coins: 100,
          total_xp: 500,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        isAdmin: true, // NOW isAdmin is true
        loading: false,
        isAuthenticated: true,
        isGuest: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        rankedProgress: null,
        isSupabaseEnabled: true,
        setupProfile: jest.fn(),
        updateProfile: jest.fn(),
        refreshProfile: jest.fn(),
      });

      rerender(<AdminPage />);

      // Flush promises to let auth token fetch complete
      await act(async () => {
        await Promise.resolve();
      });

      // THEN: Should show admin dashboard (not access denied)
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
      expect(screen.queryByText('Admin Access Required')).not.toBeInTheDocument();
    });

    test('SHOULD show access denied only when profile loaded AND user is not admin', () => {
      // GIVEN: User authenticated, profile loaded, but is_admin=false
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'user@test.com' } as any,
        profile: {
          id: 'user-1',
          username: 'regular-user',
          display_name: 'Regular User',
          is_admin: false, // NOT admin
          total_coins: 50,
          total_xp: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        isAdmin: false, // Correctly false
        loading: false, // Auth complete
        isAuthenticated: true,
        isGuest: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        rankedProgress: null,
        isSupabaseEnabled: true,
        setupProfile: jest.fn(),
        updateProfile: jest.fn(),
        refreshProfile: jest.fn(),
      });

      // WHEN: Admin page renders
      render(<AdminPage />);

      // THEN: Should show access denied (profile loaded, not admin)
      expect(screen.getByText('Admin Access Required')).toBeInTheDocument();
      expect(screen.getByText('You need administrator privileges to access this page.')).toBeInTheDocument();
    });
  });

  describe('Race Condition: authToken loading visibility', () => {
    test('SHOULD show dashboard after authToken loads for admin user', async () => {
      // GIVEN: Admin user with profile loaded
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'admin@test.com' } as any,
        profile: {
          id: 'user-1',
          username: 'admin',
          display_name: 'Admin User',
          is_admin: true,
          total_coins: 100,
          total_xp: 500,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        isAdmin: true,
        loading: false,
        isAuthenticated: true,
        isGuest: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        rankedProgress: null,
        isSupabaseEnabled: true,
        setupProfile: jest.fn(),
        updateProfile: jest.fn(),
        refreshProfile: jest.fn(),
      });

      // WHEN: Admin page renders (shows loading while authToken fetches)
      render(<AdminPage />);

      // Initially shows loading while token is being fetched
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Flush promises to let auth token fetch complete
      await act(async () => {
        await Promise.resolve();
      });

      // THEN: Should show navigation grid and page structure after token loads
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });
  });
});
