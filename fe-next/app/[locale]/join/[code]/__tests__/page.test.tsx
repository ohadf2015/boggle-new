import { vi, type MockedFunction, type MockedClass, type Mock } from 'vitest';
/**
 * Tests for Join Classroom via Shareable Link
 *
 * Reproduces bug: When student clicks join link while loading auth,
 * they get redirected to landing page instead of joining classroom.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import JoinWithCodePage from '../page';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
}));

vi.mock('@/contexts/AuthContext');
vi.mock('@/contexts/LanguageContext');
vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: ({ text }: { text?: string }) => <div data-testid="page-loader">{text}</div>,
}));
vi.mock('@/components/student/JoinClassroomForm', () => ({
  default: function MockJoinClassroomForm({ initialCode }: { initialCode: string }) {
    return <div data-testid="join-form">Join Form: {initialCode}</div>;
  },
}));

describe('JoinWithCodePage - Bug Reproduction', () => {
  const mockPush = vi.fn();
  const mockUseRouter = useRouter as MockedFunction<typeof useRouter>;
  const mockUseParams = useParams as MockedFunction<typeof useParams>;
  const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;
  const mockUseLanguage = useLanguage as MockedFunction<typeof useLanguage>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush } as any);
    mockUseParams.mockReturnValue({ code: '4HCDMS' });
    mockUseLanguage.mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      setLanguage: vi.fn(),
      languages: ['en', 'he', 'sv', 'ja', 'es'],
    } as any);

    // Clear sessionStorage
    sessionStorage.clear();
  });

  test('BUG: redirects to landing page when auth is still loading', async () => {
    // GIVEN: User clicks join link while auth is still loading
    // This simulates the race condition where user exists but profile hasn't loaded yet
    mockUseAuth.mockReturnValue({
      user: null,  // Auth still loading
      profile: null,
      isAuthenticated: false,
      loading: true,  // Key: still loading!
      isSupabaseEnabled: true,
    } as any);

    // WHEN: Page renders
    render(<JoinWithCodePage />);

    // THEN: Should NOT redirect immediately (should wait for loading to complete)
    // BUG: Current code redirects to landing page even when loading=true
    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    }, { timeout: 100 });
  });

  test('BUG: redirect loop when user signs in and returns to join page', async () => {
    // GIVEN: User just signed in, has session but profile not loaded yet
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' } as any,
      profile: null,  // Profile fetch in progress
      isAuthenticated: false,  // False because profile is null
      loading: true,
      isSupabaseEnabled: true,
    } as any);

    // AND: SessionStorage has pending join code (from previous redirect)
    sessionStorage.setItem('joinClassroomReturnCode', '4HCDMS');

    // WHEN: Page renders after redirect from useAuthInitialization
    render(<JoinWithCodePage />);

    // THEN: Should wait for loading to complete, not redirect again
    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    }, { timeout: 100 });

    // BUG: Current code checks isAuthenticated without checking loading state
    // This causes redirect loop: join -> landing -> join -> landing
  });

  test('EXPECTED: should show join form when fully authenticated', async () => {
    // GIVEN: User is fully authenticated
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' } as any,
      profile: { id: 'user-123', username: 'testuser' } as any,
      isAuthenticated: true,
      loading: false,
      isSupabaseEnabled: true,
    } as any);

    // WHEN: Page renders
    render(<JoinWithCodePage />);

    // THEN: Should show join form with code from URL
    await waitFor(() => {
      expect(screen.getByTestId('join-form')).toBeInTheDocument();
      expect(screen.getByText(/Join Form: 4HCDMS/)).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test('EXPECTED: should redirect unauthenticated user after loading completes', async () => {
    // GIVEN: Auth loading completes, user is not authenticated
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      loading: false,  // Loading complete
      isSupabaseEnabled: true,
    } as any);

    // WHEN: Page renders
    render(<JoinWithCodePage />);

    // THEN: Should save code and redirect to landing page
    await waitFor(() => {
      expect(sessionStorage.setItem).toHaveBeenCalledWith('joinClassroomReturnCode', '4HCDMS');
      expect(mockPush).toHaveBeenCalledWith('/en');
    });
  });
});
