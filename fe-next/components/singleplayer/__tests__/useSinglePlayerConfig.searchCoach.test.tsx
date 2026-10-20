/**
 * Search referrer on ?autoStart=coach must shorten before paint: no held-clock
 * lesson, shortCoach set. In-app onboarding (empty referrer) keeps the lesson.
 */
import { renderHook } from '@testing-library/react';

const params = new Map<string, string>();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: (key: string) => params.get(key) ?? null }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ unlockAudio: vi.fn(), stopMusic: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, profile: null }),
}));
vi.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: () => true,
  markOnboardingComplete: vi.fn(),
  hasPlayedBotsGame: () => false,
}));
vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
  markGuidanceShown: vi.fn(),
}));
vi.mock('@/utils/posthogEngagement', () => ({
  trackReplayClicked: vi.fn(),
  trackNextGameStarted: vi.fn(),
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/lib/retention/firstWin', () => ({ isFirstSessionPlayer: () => false }));

import { useSinglePlayerConfig } from '../useSinglePlayerConfig';

describe('useSinglePlayerConfig — search coach shorten', () => {
  beforeEach(() => {
    params.clear();
    params.set('autoStart', 'coach');
  });

  afterEach(() => {
    Object.defineProperty(document, 'referrer', { value: '', configurable: true });
  });

  it('skips the lesson for a Google referrer', () => {
    Object.defineProperty(document, 'referrer', { value: 'https://www.google.com/search?q=word+game', configurable: true });
    const { result } = renderHook(() => useSinglePlayerConfig({ searchParams: { get: (k: string) => params.get(k) ?? null } as never }));
    expect(result.current.gameState.mode).toBe('challenge');
    expect(result.current.gameState.shortCoach).toBe(true);
    expect(result.current.gameState.coach).toBe(false);
    expect(result.current.gameState.bots).toHaveLength(0);
    expect(result.current.phase).toBe('playing');
  });

  it('keeps the lesson for in-app onboarding', () => {
    Object.defineProperty(document, 'referrer', { value: '', configurable: true });
    const { result } = renderHook(() => useSinglePlayerConfig({ searchParams: { get: (k: string) => params.get(k) ?? null } as never }));
    expect(result.current.gameState.shortCoach).toBeFalsy();
    expect(result.current.gameState.coach).toBe(true);
  });
});
