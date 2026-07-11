/**
 * Brain hub — global bottom banner placement
 * Pins the ad-placement expansion (2026-07): the same reusable banner slot the
 * landing/home dashboard uses is embedded at the STRUCTURAL BOTTOM of the Brain
 * (cognitive training) hub, below the scientific-tips carousel, so it never
 * covers a drill card, the brain-score hero, or the analytics charts.
 */
import { vi, type MockedFunction } from 'vitest';
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

vi.mock('@/contexts/AuthContext');
vi.mock('@/hooks/useBrainScore');
vi.mock('@/contexts/LanguageContext');
vi.mock('@/utils/ThemeContext');
vi.mock('@/contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({ isEnabled: true, toggle: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));
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

// The banner slot itself is exercised by its own unit tests. Here we only assert
// it is embedded at the bottom of the hub, so render a lightweight stand-in.
vi.mock('@/components/ads/InlineBannerAd', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <div data-testid="hub-bottom-banner" data-variant={String(props.variant)} />
  ),
}));

const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;
const mockUseBrainScore = useBrainScore as MockedFunction<typeof useBrainScore>;
const mockUseLanguage = useLanguage as MockedFunction<typeof useLanguage>;
const mockUseTheme = useTheme as MockedFunction<typeof useTheme>;
const mockUseRouter = useRouter as MockedFunction<typeof useRouter>;

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <MusicProvider>
      <SoundEffectsProvider>{children}</SoundEffectsProvider>
    </MusicProvider>
  </QueryClientProvider>
);

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

describe('Brain hub bottom banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockUseRouter.mockReturnValue({ push: vi.fn() } as any);
    mockUseLanguage.mockReturnValue({
      language: 'en',
      setLanguage: vi.fn(),
      t: (key: string) => key,
      dir: 'ltr',
      currentFlag: '🇺🇸',
    } as any);
    mockUseTheme.mockReturnValue({ theme: 'dark', toggleTheme: vi.fn() } as any);
    mockUseAuth.mockReturnValue(authedUser as any);
    mockUseBrainScore.mockReturnValue({
      brainScore: makeBrainScore(8) as any,
      recentGameScores: [],
      drillProgress: [],
      brainScoreHistory: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      initializeBrainScore: vi.fn(),
    } as any);
  });

  it('embeds the reusable banner slot with the content variant on the main dashboard', async () => {
    render(<BrainTrainingPage />, { wrapper: AllTheProviders });
    const banner = await screen.findByTestId('hub-bottom-banner');
    expect(banner).toBeInTheDocument();
    // Non-game hub → content banner unit, never the in-flow game unit.
    expect(banner.getAttribute('data-variant')).toBe('content');
  });

  it('renders the banner AFTER the brain-score hero (structural bottom of the hub)', async () => {
    render(<BrainTrainingPage />, { wrapper: AllTheProviders });
    const banner = await screen.findByTestId('hub-bottom-banner');
    const heroLabel = screen.getByText('brain.score');
    // compareDocumentPosition returns FOLLOWING (4) when `banner` follows `heroLabel`.
    const rel = heroLabel.compareDocumentPosition(banner);
    expect(rel & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
