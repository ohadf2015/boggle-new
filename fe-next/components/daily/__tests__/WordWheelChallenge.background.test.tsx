/**
 * Background depth regression.
 *
 * Bug: the Word Wheel play area read as a flat solid black background. The
 * container was a plain `bg-neo-navy` (#1a1a2e) and the only ambient depth
 * came from the pixi bokeh layer — which only renders during `phase==='playing'`
 * and fades in slowly, so the ready/loading screens (and the first moments of
 * play) exposed flat near-black navy.
 *
 * An earlier fix added a radial gradient but ran it from `--neo-navy-radial`
 * (#1e1e3f) to `--neo-navy` (#1a1a2e) — only ~5 relative-luminance apart, i.e.
 * imperceptible, so the stage STILL read as flat black and the regression kept
 * coming back.
 *
 * Fix: run the radial gradient from a perceptibly-elevated center
 * (`--neo-navy-elevated`, #2a2a4e, ~17 luminance above the navy edge) out to
 * `--neo-navy`. This is CSS, always-on, and phase-independent, so the board
 * reads with real depth instead of flat black regardless of the pixi layer.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Stub = () => null;
    Stub.displayName = 'DynamicStub';
    return Stub;
  },
}));

vi.mock('framer-motion', () => ({
  m: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: React.ComponentProps<'div'>) => (
        <div {...props}>{children}</div>
      ),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ setGameActive: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'player-123', display_name: 'P', avatar_emoji: '🎯', avatar_color: '#fff' },
    isAuthenticated: true,
  }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

vi.mock('@/utils/dailyChallenge', () => ({
  getDailyChallengeDate: () => '2026-04-25',
  getPuzzleNumber: () => 117,
  hasPlayedWordWheelToday: () => false,
  getTodaysWordWheelResult: () => null,
  saveWordWheelResult: vi.fn(),
  hasPlayedWordHuntToday: () => false,
  getDailyStreak: () => ({ currentStreak: 0 }),
  updateDailyStreak: vi.fn(() => ({ currentStreak: 1, longestStreak: 1, lastPlayedDate: null, totalDailiesCompleted: 1 })),
}));
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  generateWordWheelPuzzle: () => ({
    centerLetter: 'A',
    outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
    validWords: [],
  }),
}));
vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: () => null,
}));
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    canShowAd: false,
    isDailyLimitReached: false,
    showAd: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('../WordWheelGame', () => ({
  __esModule: true,
  default: () => <div data-testid="word-wheel-game" />,
}));
vi.mock('../WordWheelResults', () => ({
  __esModule: true,
  default: () => <div data-testid="word-wheel-results" />,
}));
vi.mock('../TabbedDailyLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="tabbed-daily-leaderboard" />,
}));

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ hasPlayed: false }), { status: 200 }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

import WordWheelChallenge from '../WordWheelChallenge';

describe('WordWheelChallenge background', () => {
  it('gives the stage a radial depth gradient with a perceptibly-elevated center', async () => {
    render(<WordWheelChallenge />);

    const stage = await waitFor(() => screen.getByTestId('word-wheel-stage'));

    // The container must carry a radial depth gradient whose center is the
    // elevated navy (#2a2a4e) — NOT navy-radial (#1e1e3f), which sits only ~5
    // luminance above the navy edge and so reads as flat black.
    expect(stage.style.background).toContain('radial-gradient');
    expect(stage.style.background).toContain('--neo-navy-elevated');
    expect(stage.style.background).not.toContain('--neo-navy-radial');
  });
});
