import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => {
  const React = require('react');
  const createMotion = (tag: string) =>
    React.forwardRef(function M({ children, ...props }: any, ref: any) {
      return React.createElement(tag, { ref, ...props }, children);
    });
  const motion = new Proxy({} as Record<string, any>, {
    get: (_t, prop: string) => createMotion(prop),
  });
  return { motion, m: motion, AnimatePresence: ({ children }: any) => <>{children}</> };
});

const mockMarkComplete = vi.fn();
const mockMarkSkipped = vi.fn();
vi.mock('@/utils/onboardingStorage', () => ({
  markOnboardingComplete: (...a: any[]) => mockMarkComplete(...a),
  markOnboardingSkipped: (...a: any[]) => mockMarkSkipped(...a),
  hasCompletedOnboarding: () => false,
  consumePendingRoomInvite: () => null,
  hasPendingRoomInvite: () => false,
  getPendingRoomInvite: () => null,
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/en',
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr', setLanguage: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));

vi.mock('@/contexts/AccessibilityContext', () => ({
  useAccessibility: () => ({ updateSetting: vi.fn() }),
}));

vi.mock('@/utils/profileStorage', () => ({
  setStoredCustomAvatar: vi.fn(),
  getStoredCustomAvatar: vi.fn(() => null),
}));

vi.mock('@/components/auth/AuthModal', () => ({ __esModule: true, default: () => null }));

// Tutorial stub — the real component pulls in MiniGrid + framer-motion hooks.
// Expose onContinue (skip path also routes through it) as buttons so tests
// can advance the CG flow without driving the real demo.
vi.mock('../CrazyGamesTutorial', () => ({
  __esModule: true,
  default: ({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) => (
    <div data-testid="crazygames-tutorial">
      <button data-testid="cg-tutorial-continue" onClick={onContinue}>continue</button>
      <button data-testid="cg-tutorial-skip" onClick={onSkip}>skip</button>
    </div>
  ),
}));

// Stubs that should NOT mount on CrazyGames
vi.mock('../LanguageSelect', () => ({
  __esModule: true,
  default: () => <div data-testid="language-select" />,
}));
vi.mock('../TutorialGame', () => ({
  __esModule: true,
  default: () => <div data-testid="tutorial-game" />,
}));
vi.mock('../QuickProfileSetup', () => ({
  __esModule: true,
  default: () => <div data-testid="quick-profile-setup" />,
}));
vi.mock('../ScoreRevealV2', () => ({
  __esModule: true,
  default: () => <div data-testid="score-reveal" />,
}));
vi.mock('../ReturningUserStep', () => ({
  __esModule: true,
  default: () => <div data-testid="returning-user-step" />,
}));

// Force CrazyGames branch
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isOnCrazyGamesPlatform: true,
    isLoading: false,
    getSystemInfo: () => Promise.resolve(null),
  }),
}));

const mockTrack = vi.fn();
vi.mock('@/utils/growthTracking', async () => {
  const actual = await vi.importActual<any>('@/utils/growthTracking');
  return {
    ...actual,
    trackGrowthEvent: (...a: any[]) => mockTrack(...a),
    trackOnboardingStart: vi.fn(),
    trackOnboardingStep: vi.fn(),
    markFirstGameActivation: vi.fn(),
  };
});

import OnboardingFlow from '../OnboardingFlow';

describe('OnboardingFlow on CrazyGames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders CrazyGamesTutorial first — welcome and FTUE steps are gated', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    expect(screen.getByTestId('crazygames-tutorial')).toBeInTheDocument();
    expect(screen.queryByTestId('crazygames-welcome')).not.toBeInTheDocument();
    expect(screen.queryByTestId('language-select')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tutorial-game')).not.toBeInTheDocument();
    expect(screen.queryByTestId('quick-profile-setup')).not.toBeInTheDocument();
    expect(screen.queryByTestId('score-reveal')).not.toBeInTheDocument();
  });

  it('reveals CrazyGamesWelcome after tutorial onContinue', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('cg-tutorial-continue'));
    expect(screen.getByTestId('crazygames-welcome')).toBeInTheDocument();
  });

  it('reveals CrazyGamesWelcome after tutorial onSkip (never traps user)', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('cg-tutorial-skip'));
    expect(screen.getByTestId('crazygames-welcome')).toBeInTheDocument();
  });

  it('Play Daily routes to /<locale>/daily and marks complete', () => {
    const onComplete = vi.fn();
    render(<OnboardingFlow onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('cg-tutorial-continue'));
    fireEvent.click(screen.getByTestId('crazygames-welcome-cta-daily'));
    expect(mockMarkComplete).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/en/daily');
    expect(onComplete).toHaveBeenCalled();
  });

  it('Practice CTA routes to singleplayer practice', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('cg-tutorial-continue'));
    fireEvent.click(screen.getByTestId('crazygames-welcome-cta-practice'));
    expect(mockPush).toHaveBeenCalledWith('/en/singleplayer?autoStart=practice');
  });

  it('Multiplayer CTA routes to multiplayer hub', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('cg-tutorial-continue'));
    fireEvent.click(screen.getByTestId('crazygames-welcome-cta-multiplayer'));
    expect(mockPush).toHaveBeenCalledWith('/en/multiplayer');
  });

  it('emits cg_welcome_view + cg_welcome_play telemetry after tutorial', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('cg-tutorial-continue'));
    expect(mockTrack).toHaveBeenCalledWith('cg_welcome_view', expect.any(Object));
    fireEvent.click(screen.getByTestId('crazygames-welcome-cta-daily'));
    expect(mockTrack).toHaveBeenCalledWith(
      'cg_welcome_play',
      expect.objectContaining({ mode: 'daily' }),
    );
  });
});
