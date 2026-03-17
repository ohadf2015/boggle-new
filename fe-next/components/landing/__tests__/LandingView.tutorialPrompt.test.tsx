/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LandingView from '../LandingView';
import * as onboardingStorage from '@/utils/onboardingStorage';

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/en',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ locale: 'en' }),
}));

// Mock dynamic imports
jest.mock('next/dynamic', () => (fn: () => Promise<{ default: React.ComponentType }>) => {
  const Component = (props: Record<string, unknown>) => {
    const [Loaded, setLoaded] = React.useState<React.ComponentType | null>(null);
    React.useEffect(() => {
      fn().then((mod) => setLoaded(() => mod.default));
    }, []);
    return Loaded ? <Loaded {...props} /> : null;
  };
  return Component;
});

// Mock lazy-loaded components
jest.mock('@/components/daily/DailyChallengeBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="daily-banner">Daily Challenge</div>,
}));

jest.mock('@/components/OnboardingModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="onboarding-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

jest.mock('@/components/ui/PlayfulBackground', () => ({
  PlayfulBackground: () => null,
}));

jest.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock contexts
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'tutorialPrompt.title': 'First time here?',
        'tutorialPrompt.subtitle': 'Learn the basics in 30 seconds',
        'tutorialPrompt.start': 'Start',
        'tutorialPrompt.later': 'Later',
        'landing.welcomeTitle': 'Ready to Play?',
        'landing.tutorial': 'Tutorial',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    playTrack: jest.fn(),
    TRACKS: { LOBBY: 'lobby' },
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    loading: false,
  }),
}));

jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound: jest.fn(),
    toggleMute: jest.fn(),
    isMuted: false,
  }),
}));

jest.mock('@/contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({
    isEnabled: true,
    enableHaptics: jest.fn(),
    disableHaptics: jest.fn(),
    toggleHaptics: jest.fn(),
  }),
}));

// Mock hooks
jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

jest.mock('@/hooks/useMobilePortrait', () => ({
  useMobilePortrait: () => false,
}));

jest.mock('@/hooks/useLiveRoomStats', () => ({
  useLiveRoomStats: () => ({
    activePlayers: 0,
    openRooms: 0,
    totalPlayers: 0,
    refresh: jest.fn(),
  }),
}));

jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));

jest.mock('@/hooks/useTiltEffect', () => ({
  useMouseParallax: () => ({ x: 0, y: 0 }),
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {},
  }),
}));

// Mock storage utilities
jest.mock('@/utils/onboardingStorage');
jest.mock('@/utils/perfVariant', () => ({
  getPerfVariant: () => 'control',
}));

describe('LandingView Tutorial Callout for New Players', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage mock
    (onboardingStorage.hasCompletedOnboarding as jest.Mock).mockReturnValue(false);
    (onboardingStorage.markOnboardingSkipped as jest.Mock).mockImplementation(() => {});
  });

  it('should show tutorial callout near FAB button for first-time users', async () => {
    // GIVEN a first-time user (hasn't completed onboarding)
    (onboardingStorage.hasCompletedOnboarding as jest.Mock).mockReturnValue(false);

    // WHEN the landing page renders
    await act(async () => {
      render(<LandingView />);
    });

    // THEN the tutorial callout should be visible near the FAB
    await waitFor(() => {
      expect(screen.getByText('First time here?')).toBeInTheDocument();
    });

    // AND the tutorial FAB button should also be present
    expect(screen.getByRole('button', { name: /tutorial/i })).toBeInTheDocument();
  });

  it('should NOT show tutorial callout for returning users', async () => {
    // GIVEN a returning user (has completed onboarding)
    (onboardingStorage.hasCompletedOnboarding as jest.Mock).mockReturnValue(true);

    // WHEN the landing page renders
    await act(async () => {
      render(<LandingView />);
    });

    // THEN the tutorial callout should NOT be visible
    await waitFor(() => {
      expect(screen.queryByText('First time here?')).not.toBeInTheDocument();
    });

    // BUT the tutorial FAB should still be present
    expect(screen.getByRole('button', { name: /tutorial/i })).toBeInTheDocument();
  });

  it('should open onboarding modal when callout is clicked', async () => {
    // GIVEN a first-time user viewing the tutorial callout
    (onboardingStorage.hasCompletedOnboarding as jest.Mock).mockReturnValue(false);

    await act(async () => {
      render(<LandingView />);
    });

    // Wait for callout to appear
    await waitFor(() => {
      expect(screen.getByText('First time here?')).toBeInTheDocument();
    });

    // WHEN the user clicks the callout
    const callout = screen.getByText('First time here?');
    await act(async () => {
      fireEvent.click(callout);
    });

    // THEN the onboarding modal should open
    await waitFor(() => {
      expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument();
    });

    // AND the callout should be hidden (wait for animation)
    await waitFor(() => {
      expect(screen.queryByText('First time here?')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should open onboarding modal when FAB button is clicked', async () => {
    // GIVEN a first-time user
    (onboardingStorage.hasCompletedOnboarding as jest.Mock).mockReturnValue(false);

    await act(async () => {
      render(<LandingView />);
    });

    // Wait for callout to appear
    await waitFor(() => {
      expect(screen.getByText('First time here?')).toBeInTheDocument();
    });

    // WHEN the user clicks the FAB button
    const fabButton = screen.getByRole('button', { name: /tutorial/i });
    await act(async () => {
      fireEvent.click(fabButton);
    });

    // THEN the onboarding modal should open
    await waitFor(() => {
      expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument();
    });

    // AND the callout should be hidden (wait for animation)
    await waitFor(() => {
      expect(screen.queryByText('First time here?')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // AND onboarding should be marked as skipped
    expect(onboardingStorage.markOnboardingSkipped).toHaveBeenCalled();
  });

  it('should hide callout after user clicks FAB and mark onboarding as done', async () => {
    // GIVEN a first-time user viewing the callout
    (onboardingStorage.hasCompletedOnboarding as jest.Mock).mockReturnValue(false);

    await act(async () => {
      render(<LandingView />);
    });

    // Wait for callout to appear
    await waitFor(() => {
      expect(screen.getByText('First time here?')).toBeInTheDocument();
    });

    // WHEN the user clicks the FAB button
    const fabButton = screen.getByRole('button', { name: /tutorial/i });
    await act(async () => {
      fireEvent.click(fabButton);
    });

    // THEN the onboarding should be marked as skipped
    expect(onboardingStorage.markOnboardingSkipped).toHaveBeenCalled();
  });
});
