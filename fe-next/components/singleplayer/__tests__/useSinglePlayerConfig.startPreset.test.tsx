/**
 * useSinglePlayerConfig — handleStartPreset (the results-screen "next game"
 * picker). Starting a preset in-page must switch the game state to that
 * preset and go straight to 'playing' without any navigation, so returning
 * players never hit the bare-/singleplayer re-entry gate.
 */
import { renderHook, act } from '@testing-library/react';

const mockRouterReplace = vi.fn();
const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace, prefetch: vi.fn() }),
  useSearchParams: () => ({ get: (key: string) => (key === 'autoStart' ? 'bots' : null) }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ unlockAudio: vi.fn() }),
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
import { useSearchParams } from 'next/navigation';

describe('useSinglePlayerConfig — handleStartPreset', () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
    mockRouterReplace.mockClear();
  });

  it('Given a bots game on EASY, When "competitive" is started from results, Then state is MEDIUM vs 2 bots and phase is playing — no navigation', () => {
    const { result } = renderHook(() => useSinglePlayerConfig({ searchParams: useSearchParams() }));
    // autoStart=bots → friendly (EASY, 1 bot) auto-started.
    expect(result.current.gameState.difficulty).toBe('EASY');

    act(() => result.current.setPhase('results'));
    act(() => result.current.handleStartPreset('competitive'));

    expect(result.current.phase).toBe('playing');
    expect(result.current.gameState.mode).toBe('solo-bots');
    expect(result.current.gameState.difficulty).toBe('MEDIUM');
    expect(result.current.gameState.bots).toHaveLength(2);
    expect(result.current.gameState.grid).toBeNull();
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('Given "battle", When started, Then HARD vs 3 bots', () => {
    const { result } = renderHook(() => useSinglePlayerConfig({ searchParams: useSearchParams() }));
    act(() => result.current.setPhase('results'));
    act(() => result.current.handleStartPreset('battle'));
    expect(result.current.gameState.difficulty).toBe('HARD');
    expect(result.current.gameState.bots).toHaveLength(3);
    expect(result.current.phase).toBe('playing');
  });

  it('Given an unknown preset id, When started, Then it degrades to a plain replay of the current setup', () => {
    const { result } = renderHook(() => useSinglePlayerConfig({ searchParams: useSearchParams() }));
    const before = result.current.gameState;
    act(() => result.current.setPhase('results'));
    act(() => result.current.handleStartPreset('nope'));
    expect(result.current.phase).toBe('playing');
    expect(result.current.gameState.difficulty).toBe(before.difficulty);
    expect(result.current.gameState.bots).toHaveLength(before.bots.length);
  });
});
