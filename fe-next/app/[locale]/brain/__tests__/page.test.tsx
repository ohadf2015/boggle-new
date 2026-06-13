import { vi, type MockedFunction, type MockedClass, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BrainTrainingPage from '../PageClient';
import { useAuth } from '@/contexts/AuthContext';
import { useBrainScore } from '@/hooks/useBrainScore';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { useRouter } from 'next/navigation';
import { MusicProvider } from '@/contexts/MusicContext';
import { SoundEffectsProvider } from '@/contexts/SoundEffectsContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock all dependencies
vi.mock('@/contexts/AuthContext');
vi.mock('@/hooks/useBrainScore');
vi.mock('@/contexts/LanguageContext');
vi.mock('@/utils/ThemeContext');
vi.mock('@/contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({
    isEnabled: true,
    toggle: vi.fn(),
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock NavigationContext - AutoHideHeader uses useNavigation
vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({
    isInGame: false,
    setIsInGame: vi.fn(),
    activeTab: 'brain',
    setActiveTab: vi.fn(),
  }),
  useHideNavigation: () => vi.fn(),
  NavigationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;
const mockUseBrainScore = useBrainScore as MockedFunction<typeof useBrainScore>;
const mockUseLanguage = useLanguage as MockedFunction<typeof useLanguage>;
const mockUseTheme = useTheme as MockedFunction<typeof useTheme>;
const mockUseRouter = useRouter as MockedFunction<typeof useRouter>;

describe('BrainTrainingPage - Loading States', () => {
  const mockRouter = {
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  };

  // Wrapper component to provide necessary contexts
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MusicProvider>
        <SoundEffectsProvider>
          {children}
        </SoundEffectsProvider>
      </MusicProvider>
    </QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock matchMedia for framer-motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Default mocks
    mockUseRouter.mockReturnValue(mockRouter as any);
    mockUseLanguage.mockReturnValue({
      language: 'en',
      setLanguage: vi.fn(),
      t: (key: string) => key,
      dir: 'ltr',
      currentFlag: '🇺🇸',
    });
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      toggleTheme: vi.fn(),
    });
  });

  describe('Auth Loading State', () => {
    it('should show PageLoader while auth is validating (auth loading)', () => {
      // Auth is still loading
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        rankedProgress: null,
        loading: true, // Auth is loading
        isSupabaseEnabled: true,
        isAuthenticated: false,
        isGuest: true,
        isAdmin: false,
      isTeacher: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        setupProfile: vi.fn(),
        updateProfile: vi.fn(),
        refreshProfile: vi.fn(),
      });

      // Brain score is not loading
      mockUseBrainScore.mockReturnValue({
        brainScore: null,
        recentGameScores: [],
        drillProgress: [],
        brainScoreHistory: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
        initializeBrainScore: vi.fn(),
      });

      render(<BrainTrainingPage />, { wrapper: AllTheProviders });

      // Should show PageLoader, NOT the "Sign in" message
      expect(screen.getByTestId('page-loader')).toBeInTheDocument();

      // Should NOT show "Sign in to see your progress" message
      expect(screen.queryByText('brain.guestView.title')).not.toBeInTheDocument();
      expect(screen.queryByText('auth.signIn')).not.toBeInTheDocument();
      expect(screen.queryByText('auth.signUp')).not.toBeInTheDocument();
    });

    it('should show PageLoader while brain score is loading', () => {
      // Auth is done loading, user is authenticated
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1' } as any,
        profile: { id: 'user-1', username: 'test' } as any,
        rankedProgress: null,
        loading: false,
        isSupabaseEnabled: true,
        isAuthenticated: true,
        isGuest: false,
        isAdmin: false,
      isTeacher: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        setupProfile: vi.fn(),
        updateProfile: vi.fn(),
        refreshProfile: vi.fn(),
      });

      // Brain score is loading
      mockUseBrainScore.mockReturnValue({
        brainScore: null,
        recentGameScores: [],
        drillProgress: [],
        brainScoreHistory: [],
        isLoading: true, // Brain score is loading
        error: null,
        refresh: vi.fn(),
        initializeBrainScore: vi.fn(),
      });

      render(<BrainTrainingPage />, { wrapper: AllTheProviders });

      // Should show PageLoader
      expect(screen.getByTestId('page-loader')).toBeInTheDocument();
    });

    it('should show "Sign in" message only after auth is done loading and user is not authenticated', async () => {
      // Auth is done loading, user is NOT authenticated
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        rankedProgress: null,
        loading: false, // Auth is done loading
        isSupabaseEnabled: true,
        isAuthenticated: false,
        isGuest: true,
        isAdmin: false,
      isTeacher: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        setupProfile: vi.fn(),
        updateProfile: vi.fn(),
        refreshProfile: vi.fn(),
      });

      // Brain score is not loading
      mockUseBrainScore.mockReturnValue({
        brainScore: null,
        recentGameScores: [],
        drillProgress: [],
        brainScoreHistory: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
        initializeBrainScore: vi.fn(),
      });

      render(<BrainTrainingPage />, { wrapper: AllTheProviders });

      // Should show "Sign in" message
      await waitFor(() => {
        expect(screen.getByText('brain.guestView.title')).toBeInTheDocument();
      });

      expect(screen.getByText('auth.signIn')).toBeInTheDocument();
      expect(screen.getByText('auth.signUp')).toBeInTheDocument();
    });

    it('shows the drill grid for anonymous users (audit H2 — conversion fix)', async () => {
      // Audit 2026-05-02 finding H2: anonymous /brain showed only "Sign In to
      // Track Your Gains" — no drill list, no value-prop, no preview. This
      // test pins the fix: drill section must render alongside the sign-in
      // CTA so guests can see what they'd unlock.
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        rankedProgress: null,
        loading: false,
        isSupabaseEnabled: true,
        isAuthenticated: false,
        isGuest: true,
        isAdmin: false,
      isTeacher: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        setupProfile: vi.fn(),
        updateProfile: vi.fn(),
        refreshProfile: vi.fn(),
      });

      mockUseBrainScore.mockReturnValue({
        brainScore: null,
        recentGameScores: [],
        drillProgress: [],
        brainScoreHistory: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
        initializeBrainScore: vi.fn(),
      });

      render(<BrainTrainingPage />, { wrapper: AllTheProviders });

      // QuickDrillsSection's heading uses the t('brain.quickDrills') key.
      await waitFor(() => {
        expect(screen.getByText('brain.quickDrills')).toBeInTheDocument();
      });
      // Sign-in CTA still present — drill grid is a supplement, not a replacement.
      expect(screen.getByText('auth.signIn')).toBeInTheDocument();
    });

    // --- Play-first layout (2026-06-13 impeccable overhaul) ---------------
    // User ask: "bring up the action we want the player to click (right now
    // choosing the game is in the bottom)". The drill picker (QuickDrillsSection)
    // must render ABOVE the stats stack (Brain Score Hero, cognitive profile),
    // and the redundant duplicate empty-state card must be gone.
    const authedUser = {
      user: { id: 'user-1' } as any,
      profile: { id: 'user-1', username: 'test' } as any,
      rankedProgress: null,
      loading: false,
      isSupabaseEnabled: true,
      isAuthenticated: true,
      isGuest: false,
      isAdmin: false,
      isTeacher: false,
      canPlayRanked: false,
      gamesUntilRanked: 10,
      needsProfileCustomization: false,
      setupProfile: vi.fn(),
      updateProfile: vi.fn(),
      refreshProfile: vi.fn(),
    };

    const makeBrainScore = (gamesAnalyzed: number) => ({
      id: 'bs-1',
      userId: 'user-1',
      overallScore: 642,
      tier: 'advanced' as const,
      tierProgress: 50,
      gamesAnalyzed,
      drillsCompleted: 3,
      currentStreak: 2,
      longestStreak: 5,
      lastActivityAt: null,
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-12T00:00:00Z',
      domains: {
        processingSpeed: { score: 60, trend: 'improving' as const },
        workingMemory: { score: 55, trend: 'stable' as const },
        attention: { score: 70, trend: 'improving' as const },
        flexibility: { score: 65, trend: 'declining' as const },
        vocabulary: { score: 80, trend: 'improving' as const },
      },
    });

    it('renders the drill picker ABOVE the brain-score stats (play-first)', async () => {
      mockUseAuth.mockReturnValue(authedUser);
      mockUseBrainScore.mockReturnValue({
        brainScore: makeBrainScore(8) as any,
        recentGameScores: [],
        drillProgress: [],
        brainScoreHistory: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
        initializeBrainScore: vi.fn(),
      });

      render(<BrainTrainingPage />, { wrapper: AllTheProviders });

      const picker = await screen.findByText('brain.quickDrills');
      const heroLabel = screen.getByText('brain.score');

      // The picker node must appear before the hero node in document order.
      // Node.compareDocumentPosition returns DOCUMENT_POSITION_FOLLOWING (4)
      // when `heroLabel` follows `picker`.
      const rel = picker.compareDocumentPosition(heroLabel);
      expect(rel & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('does not render a redundant empty-state card for a zero-games dashboard', async () => {
      // Two code paths once rendered the same "Let's Train" card (the
      // `!brainScore` early-return and the `gamesAnalyzed === 0` block). The
      // picker-at-top now IS the call to action, so the duplicate must be gone.
      mockUseAuth.mockReturnValue(authedUser);
      mockUseBrainScore.mockReturnValue({
        brainScore: makeBrainScore(0) as any,
        recentGameScores: [],
        drillProgress: [],
        brainScoreHistory: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
        initializeBrainScore: vi.fn(),
      });

      render(<BrainTrainingPage />, { wrapper: AllTheProviders });

      // Picker present (the real CTA)...
      await screen.findByText('brain.quickDrills');
      // ...and no separate redundant empty-state title card.
      expect(screen.queryByText('brain.empty.title')).not.toBeInTheDocument();
    });

    it('still surfaces the drill grid when the score fetch fails offline (graceful degrade)', async () => {
      // On a flight the Supabase score fetch fails. The hub must NOT dead-end on
      // an error card — the 5 drills are bundled + client-side, so they stay
      // playable. Pins the offline graceful-degrade: drills render alongside the
      // (still useful) error notice + retry.
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1' } as any,
        profile: { id: 'user-1', username: 'test' } as any,
        rankedProgress: null,
        loading: false,
        isSupabaseEnabled: true,
        isAuthenticated: true,
        isGuest: false,
        isAdmin: false,
        isTeacher: false,
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        setupProfile: vi.fn(),
        updateProfile: vi.fn(),
        refreshProfile: vi.fn(),
      });

      mockUseBrainScore.mockReturnValue({
        brainScore: null,
        recentGameScores: [],
        drillProgress: [],
        brainScoreHistory: [],
        isLoading: false,
        error: 'Network request failed',
        refresh: vi.fn(),
        initializeBrainScore: vi.fn(),
      });

      render(<BrainTrainingPage />, { wrapper: AllTheProviders });

      // Drills reachable despite the error.
      await waitFor(() => {
        expect(screen.getByText('brain.quickDrills')).toBeInTheDocument();
      });
      // Retry affordance is still there for when connectivity returns.
      expect(screen.getByText('brain.errors.retry')).toBeInTheDocument();
    });
  });
});
