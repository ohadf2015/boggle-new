import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BrainTrainingPage from '../page';
import { useAuth } from '@/contexts/AuthContext';
import { useBrainScore } from '@/hooks/useBrainScore';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { useRouter } from 'next/navigation';
import { MusicProvider } from '@/contexts/MusicContext';
import { SoundEffectsProvider } from '@/contexts/SoundEffectsContext';
import React from 'react';

// Mock all dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/hooks/useBrainScore');
jest.mock('@/contexts/LanguageContext');
jest.mock('@/utils/ThemeContext');
jest.mock('@/contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({
    isEnabled: true,
    toggle: jest.fn(),
  }),
}));
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseBrainScore = useBrainScore as jest.MockedFunction<typeof useBrainScore>;
const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('BrainTrainingPage - Loading States', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  // Wrapper component to provide necessary contexts
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
    <MusicProvider>
      <SoundEffectsProvider>
        {children}
      </SoundEffectsProvider>
    </MusicProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock matchMedia for framer-motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    // Default mocks
    mockUseRouter.mockReturnValue(mockRouter as any);
    mockUseLanguage.mockReturnValue({
      language: 'en',
      setLanguage: jest.fn(),
      t: (key: string) => key,
      dir: 'ltr',
      currentFlag: '🇺🇸',
    });
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      toggleTheme: jest.fn(),
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
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        setupProfile: jest.fn(),
        updateProfile: jest.fn(),
        refreshProfile: jest.fn(),
      });

      // Brain score is not loading
      mockUseBrainScore.mockReturnValue({
        brainScore: null,
        recentGameScores: [],
        drillProgress: [],
        brainScoreHistory: [],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        initializeBrainScore: jest.fn(),
      });

      render(<BrainTrainingPage />, { wrapper: AllTheProviders });

      // Should show PageLoader, NOT the "Sign in" message
      expect(screen.getByTestId('page-loader')).toBeInTheDocument();

      // Should NOT show "Sign in to see your progress" message
      expect(screen.queryByText('brain.guestView.title')).not.toBeInTheDocument();
      expect(screen.queryByText('common.signIn')).not.toBeInTheDocument();
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
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        setupProfile: jest.fn(),
        updateProfile: jest.fn(),
        refreshProfile: jest.fn(),
      });

      // Brain score is loading
      mockUseBrainScore.mockReturnValue({
        brainScore: null,
        recentGameScores: [],
        drillProgress: [],
        brainScoreHistory: [],
        isLoading: true, // Brain score is loading
        error: null,
        refresh: jest.fn(),
        initializeBrainScore: jest.fn(),
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
        canPlayRanked: false,
        gamesUntilRanked: 10,
        needsProfileCustomization: false,
        setupProfile: jest.fn(),
        updateProfile: jest.fn(),
        refreshProfile: jest.fn(),
      });

      // Brain score is not loading
      mockUseBrainScore.mockReturnValue({
        brainScore: null,
        recentGameScores: [],
        drillProgress: [],
        brainScoreHistory: [],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        initializeBrainScore: jest.fn(),
      });

      render(<BrainTrainingPage />, { wrapper: AllTheProviders });

      // Should show "Sign in" message
      await waitFor(() => {
        expect(screen.getByText('brain.guestView.title')).toBeInTheDocument();
      });

      expect(screen.getByText('common.signIn')).toBeInTheDocument();
    });
  });
});
