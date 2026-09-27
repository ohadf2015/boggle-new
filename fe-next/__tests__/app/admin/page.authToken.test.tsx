import { vi, type MockedFunction, type MockedClass, type Mock } from 'vitest';
/**
 * Test: Admin page should not show infinite loading when authToken fetching fails
 *
 * Bug Context:
 * - Admin page shows loading when authToken is null (line 77)
 * - authToken only fetched when isAdmin is true (lines 46-50)
 * - If isAdmin check takes time, page stays in loading forever
 * - Circular dependency: loading depends on authToken, authToken depends on isAdmin
 *
 * Expected Behavior:
 * - Admin page should show content even if authToken is initially null
 * - authToken should fetch independently without blocking page render
 * - Loading should only show while checking authentication, not indefinitely
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminPage from '@/app/[locale]/admin/page';

// Mock dependencies
vi.mock('@/contexts/AuthContext');
vi.mock('@/contexts/LanguageContext');
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: vi.fn(() => '/en/admin'),
}));

// Mock child components
vi.mock('@/components/Header', () => ({
  __esModule: true,
  default: () => <div data-testid="header">Header</div>,
}));
vi.mock('@/components/admin/LiveMonitor', () => ({
  LiveMonitor: () => <div data-testid="live-monitor">LiveMonitor</div>,
}));
vi.mock('@/components/admin/TodayGamesHistory', () => ({
  TodayGamesHistory: () => <div data-testid="games-history">TodayGamesHistory</div>,
}));
vi.mock('@/components/admin/GamesDiagnostic', () => ({
  GamesDiagnostic: () => <div data-testid="games-diagnostic">GamesDiagnostic</div>,
}));
vi.mock('@/components/admin/EmailTestPanel', () => ({
  EmailTestPanel: () => <div data-testid="email-panel">EmailTestPanel</div>,
}));
vi.mock('@/components/ui/PullToRefreshWrapper', () => ({
  PullToRefreshWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/utils/mobileAccessibility', () => ({
  isMobileDevice: () => false,
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

describe('Admin Page - authToken loading issue', () => {
  const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;
  const mockUseLanguage = useLanguage as MockedFunction<typeof useLanguage>;
  const mockUseAdminAuth = useAdminAuth as MockedFunction<typeof useAdminAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default language context
    mockUseLanguage.mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      setLanguage: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  test('should NOT show infinite loading when authToken fetch is slow', async () => {
    // Simulate admin user authenticated
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-123', email: 'admin@test.com' },
      profile: { id: 'admin-123', display_name: 'Admin User', is_admin: true },
      isAdmin: true,
      loading: false,
    } as any);

    // Simulate SLOW authToken fetch — initially loading
    mockUseAdminAuth.mockReturnValue({
      authToken: null,
      refreshToken: vi.fn(),
      isLoading: true,
      isRefreshing: false,
      error: null,
    });

    const { rerender } = render(<AdminPage />);

    // Initially shows loading
    expect(screen.getByText(/common\.loading/i)).toBeInTheDocument();

    // Token fetch completes
    mockUseAdminAuth.mockReturnValue({
      authToken: 'mock-token-123',
      refreshToken: vi.fn(),
      isLoading: false,
      isRefreshing: false,
      error: null,
    });

    rerender(<AdminPage />);

    // After fetch completes, page should render
    await waitFor(() => {
      expect(screen.getByText(/admin\.dashboard/i)).toBeInTheDocument();
    });

    // Main "common.loading" loader should NOT be present
    expect(screen.queryByText(/common\.loading/i)).not.toBeInTheDocument();
  });

  test('should show dashboard content even if authToken is temporarily null', async () => {
    // Admin user with profile loaded
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-123', email: 'admin@test.com' },
      profile: { id: 'admin-123', display_name: 'Admin User', is_admin: true },
      isAdmin: true,
      loading: false,
    } as any);

    // authToken is null but not loading (token not yet available)
    mockUseAdminAuth.mockReturnValue({
      authToken: null,
      refreshToken: vi.fn(),
      isLoading: false,
      isRefreshing: false,
      error: null,
    });

    render(<AdminPage />);

    // Dashboard should appear (not stuck loading)
    await waitFor(() => {
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  test('should not block page render waiting for authToken when user is admin', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-123', email: 'admin@test.com' },
      profile: { id: 'admin-123', display_name: 'Admin User', is_admin: true },
      isAdmin: true,
      loading: false,
    } as any);

    // Token already available
    mockUseAdminAuth.mockReturnValue({
      authToken: 'mock-token-123',
      refreshToken: vi.fn(),
      isLoading: false,
      isRefreshing: false,
      error: null,
    });

    render(<AdminPage />);

    // Should not show loading
    await waitFor(() => {
      const loading = screen.queryByText(/common\.loading/i);
      expect(loading).not.toBeInTheDocument();
    });
  });
});
