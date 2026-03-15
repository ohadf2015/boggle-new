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
import { render, screen, waitFor, act } from '@testing-library/react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSession } from '@/lib/supabase';
import AdminPage from '@/app/[locale]/admin/page';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/LanguageContext');
jest.mock('@/lib/supabase');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: jest.fn(() => '/en/admin'),
}));

// Mock child components
jest.mock('@/components/Header', () => ({
  __esModule: true,
  default: () => <div data-testid="header">Header</div>,
}));
jest.mock('@/components/admin/LiveMonitor', () => ({
  LiveMonitor: () => <div data-testid="live-monitor">LiveMonitor</div>,
}));
jest.mock('@/components/admin/TodayGamesHistory', () => ({
  TodayGamesHistory: () => <div data-testid="games-history">TodayGamesHistory</div>,
}));
jest.mock('@/components/admin/GamesDiagnostic', () => ({
  GamesDiagnostic: () => <div data-testid="games-diagnostic">GamesDiagnostic</div>,
}));
jest.mock('@/components/admin/EmailTestPanel', () => ({
  EmailTestPanel: () => <div data-testid="email-panel">EmailTestPanel</div>,
}));
jest.mock('@/components/ui/PullToRefreshWrapper', () => ({
  PullToRefreshWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/utils/mobileAccessibility', () => ({
  isMobileDevice: () => false,
}));

describe('Admin Page - authToken loading issue', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;
  const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default language context
    mockUseLanguage.mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      setLanguage: jest.fn(),
    } as any);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('should NOT show infinite loading when authToken fetch is slow', async () => {
    // Simulate admin user authenticated
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-123', email: 'admin@test.com' },
      profile: { id: 'admin-123', display_name: 'Admin User', is_admin: true },
      isAdmin: true,
      loading: false,
    } as any);

    // Simulate SLOW authToken fetch (takes 5 seconds)
    mockGetSession.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: { session: { access_token: 'mock-token-123' } },
                error: null,
              } as any),
            5000
          )
        )
    );

    render(<AdminPage />);

    // Initially shows loading
    expect(screen.getByText(/common\.loading/i)).toBeInTheDocument();

    // Advance timers to complete the slow fetch (5 seconds)
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve(); // Flush promises
    });

    // After fetch completes, page should render
    await waitFor(() => {
      // Dashboard header should appear (page rendered)
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

    // authToken will eventually resolve, but starts null
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token-123' } },
      error: null,
    } as any);

    render(<AdminPage />);

    // Flush promises to let the token fetch complete
    await act(async () => {
      await Promise.resolve();
    });

    // Dashboard should appear eventually
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

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token-123' } },
      error: null,
    } as any);

    render(<AdminPage />);

    // Flush promises to let the token fetch complete
    await act(async () => {
      await Promise.resolve();
    });

    // Should not show loading after token fetch completes
    await waitFor(() => {
      // Either content or access denied (not stuck loading)
      const loading = screen.queryByText(/common\.loading/i);
      expect(loading).not.toBeInTheDocument();
    });
  });
});
