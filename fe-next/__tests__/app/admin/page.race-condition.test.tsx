import { vi, type MockedFunction, type MockedClass, type Mock } from 'vitest';
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


import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminPage from '@/app/[locale]/admin/page';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/supabase';

// Mock dependencies
vi.mock('@/contexts/AuthContext');
vi.mock('@/contexts/LanguageContext');
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/en/admin'),
}));
vi.mock('@/lib/supabase', () => ({
  getSession: vi.fn(),
}));

const mockGetSession = getSession as MockedFunction<typeof getSession>;
vi.mock('@/components/Header', () => ({
  default: function MockHeader() {
    return <div data-testid="mock-header">Header</div>;
  },
}));
vi.mock('@/components/admin/LiveMonitor', () => {
  return {
    LiveMonitor: function MockLiveMonitor() {
      return <div data-testid="mock-live-monitor">LiveMonitor</div>;
    },
  };
});
vi.mock('@/components/admin/TodayGamesHistory', () => {
  return {
    TodayGamesHistory: function MockTodayGamesHistory() {
      return <div data-testid="mock-today-games">TodayGamesHistory</div>;
    },
  };
});
vi.mock('@/components/admin/GamesDiagnostic', () => {
  return {
    GamesDiagnostic: function MockGamesDiagnostic() {
      return <div data-testid="mock-games-diagnostic">GamesDiagnostic</div>;
    },
  };
});
vi.mock('@/components/admin/EmailTestPanel', () => {
  return {
    EmailTestPanel: function MockEmailTestPanel() {
      return <div data-testid="mock-email-test">EmailTestPanel</div>;
    },
  };
});
vi.mock('@/utils/mobileAccessibility', () => ({
  isMobileDevice: vi.fn(() => false),
}));
vi.mock('@/components/admin/overview/KPICards', () => ({
  KPICards: () => <div data-testid="kpi-cards">KPICards</div>,
}));
vi.mock('@/components/admin/overview/SystemHealth', () => ({
  SystemHealth: () => <div data-testid="system-health">SystemHealth</div>,
}));
vi.mock('@/components/admin/sidebar/AdminSidebar', () => ({
  AdminSidebar: () => <div data-testid="admin-sidebar">AdminSidebar</div>,
}));
vi.mock('@/components/admin/sidebar/AdminBottomNav', () => ({
  AdminBottomNav: () => <div data-testid="admin-bottom-nav">AdminBottomNav</div>,
}));
vi.mock('@/components/ui/Loader', () => ({
  Loader: ({ text }: { text?: string }) => <div>{text}</div>,
}));
vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: ({ text }: { text?: string }) => <div>{text}</div>,
}));
vi.mock('@/hooks/useAdminAuth', () => ({
  useAdminAuth: vi.fn(() => ({
    authToken: null,
    refreshToken: vi.fn(),
    isLoading: false,
    isRefreshing: false,
    error: null,
  })),
}));
vi.mock('@/hooks/useAdminDashboard', () => ({
  useAdminDashboard: vi.fn(() => ({
    stats: null,
    health: null,
    loading: false,
    error: null,
  })),
}));
vi.mock('@/components/ui/PullToRefreshWrapper', () => {
  return {
    PullToRefreshWrapper: function MockPullToRefreshWrapper({ children }: any) {
      return <div data-testid="mock-pull-to-refresh">{children}</div>;
    },
  };
});

const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;
const mockUseLanguage = useLanguage as MockedFunction<typeof useLanguage>;
const mockUseRouter = useRouter as MockedFunction<typeof useRouter>;

describe('AdminPage - Race Condition Tests', () => {
  const mockRouter = {
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
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
    setLanguage: vi.fn(),
    dir: 'ltr' as const,
    currentFlag: '🇺🇸',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUseRouter.mockReturnValue(mockRouter as any);
    mockUseLanguage.mockReturnValue(mockLanguageContext);
    // Default mock for getSession (returns valid token immediately)
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token-123' } },
      error: null,
    } as any);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Race Condition: Auth loads before Profile', () => {
    test('SHOULD show loading state when user exists but profile is null', () => {
      // GIVEN: User authenticated but profile not yet loaded (race condition scenario)
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'admin@test.com' } as any,
        profile: null, // Profile not yet loaded
        isAdmin: false,
      isTeacher: false, // False because profile is null
        loading: false, // Auth loading complete
        isAuthenticated: true,
        isGuest: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        rankedProgress: null,
        isSupabaseEnabled: true,
        setupProfile: vi.fn(),
        updateProfile: vi.fn(),
        refreshProfile: vi.fn(),
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
        isAdmin: false,
      isTeacher: false, // False because profile is null
        loading: false, // Auth check complete
        isAuthenticated: true,
        isGuest: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        rankedProgress: null,
        isSupabaseEnabled: true,
        setupProfile: vi.fn(),
        updateProfile: vi.fn(),
        refreshProfile: vi.fn(),
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
      isTeacher: false,
        loading: false,
        isAuthenticated: true,
        isGuest: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        rankedProgress: null,
        isSupabaseEnabled: true,
        setupProfile: vi.fn(),
        updateProfile: vi.fn(),
        refreshProfile: vi.fn(),
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
        isAdmin: true,
      isTeacher: false, // NOW isAdmin is true
        loading: false,
        isAuthenticated: true,
        isGuest: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        rankedProgress: null,
        isSupabaseEnabled: true,
        setupProfile: vi.fn(),
        updateProfile: vi.fn(),
        refreshProfile: vi.fn(),
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
        isAdmin: false,
      isTeacher: false, // Correctly false
        loading: false, // Auth complete
        isAuthenticated: true,
        isGuest: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        rankedProgress: null,
        isSupabaseEnabled: true,
        setupProfile: vi.fn(),
        updateProfile: vi.fn(),
        refreshProfile: vi.fn(),
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
      isTeacher: false,
        loading: false,
        isAuthenticated: true,
        isGuest: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        rankedProgress: null,
        isSupabaseEnabled: true,
        setupProfile: vi.fn(),
        updateProfile: vi.fn(),
        refreshProfile: vi.fn(),
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
