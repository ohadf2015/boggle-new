import { vi, type MockedFunction, type MockedClass, type Mock } from 'vitest';
/**
 * Tests for Student Join Classroom Page
 *
 * Reproduces bug: When student navigates to join page while auth is loading,
 * they get redirected to landing page instead of seeing the join form.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import StudentJoinPageClient from '../PageClient';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/contexts/AuthContext');
vi.mock('@/contexts/LanguageContext');
vi.mock('@/components/student/JoinClassroomForm', () => ({
  default: function MockJoinClassroomForm() {
    return <div data-testid="join-form">Join Classroom Form</div>;
  },
}));

describe('StudentJoinPageClient - Auth Loading Bug', () => {
  const mockPush = vi.fn();
  const mockUseRouter = useRouter as MockedFunction<typeof useRouter>;
  const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;
  const mockUseLanguage = useLanguage as MockedFunction<typeof useLanguage>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush } as any);
    mockUseLanguage.mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      setLanguage: vi.fn(),
      languages: ['en', 'he', 'sv', 'ja', 'es'],
    } as any);
  });

  test('should NOT redirect when auth is still loading', async () => {
    // GIVEN: User navigates to join page while auth is still loading
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      loading: true, // Key: still loading!
      isSupabaseEnabled: true,
    } as any);

    // WHEN: Page renders
    render(<StudentJoinPageClient />);

    // THEN: Should NOT redirect - should show loader and wait for loading to complete
    // BUG: Current code redirects to landing page even when loading=true
    await waitFor(
      () => {
        expect(mockPush).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );
  });

  test('should show loader while auth is loading', async () => {
    // GIVEN: Auth is loading
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      loading: true,
      isSupabaseEnabled: true,
    } as any);

    // WHEN: Page renders
    render(<StudentJoinPageClient />);

    // THEN: Should show loader (not redirect)
    expect(screen.getByText('common.loading')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('should show join form when fully authenticated', async () => {
    // GIVEN: User is fully authenticated
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' } as any,
      profile: { id: 'user-123', username: 'testuser' } as any,
      isAuthenticated: true,
      loading: false,
      isSupabaseEnabled: true,
    } as any);

    // WHEN: Page renders
    render(<StudentJoinPageClient />);

    // THEN: Should show join form
    await waitFor(() => {
      expect(screen.getByTestId('join-form')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test('shows the join form (NOT a redirect) for a logged-out student — they join as a guest', async () => {
    // GIVEN: Auth loading completes, user is not authenticated.
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      loading: false, // Loading complete
      isSupabaseEnabled: true,
    } as any);

    // WHEN: Page renders
    render(<StudentJoinPageClient />);

    // THEN: Account-less students must reach the form (guest join), not be
    // bounced to the landing page.
    await waitFor(() => {
      expect(screen.getByTestId('join-form')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('should NOT redirect when user exists but profile still loading', async () => {
    // GIVEN: User signed in, but profile fetch in progress
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' } as any,
      profile: null, // Profile not yet loaded
      isAuthenticated: false, // False because profile is null
      loading: true, // Still loading profile
      isSupabaseEnabled: true,
    } as any);

    // WHEN: Page renders
    render(<StudentJoinPageClient />);

    // THEN: Should wait for loading, not redirect
    await waitFor(
      () => {
        expect(mockPush).not.toHaveBeenCalled();
      },
      { timeout: 100 }
    );
  });
});
