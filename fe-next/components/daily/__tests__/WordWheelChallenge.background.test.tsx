/**
 * Background depth + ambient regression (root-cause fix).
 *
 * Bug: the Word Wheel play area read as a flat solid black background with no
 * ambient feel. Depth relied on two inadequate sources:
 *   1. A navy-only radial gradient. Successive fixes swapped its center token
 *      (`--neo-navy-radial` #1e1e3f → `--neo-navy-elevated` #2a2a4e) but both
 *      sit too close to the `--neo-navy` (#1a1a2e) edge to register on-device,
 *      so the stage kept reading as flat black — the regression kept returning.
 *   2. The PixiJS bokeh layer, which only paints during `phase==='playing'` and
 *      is sparse/faint, so the broad "ambient feel" was effectively absent.
 *
 * Root-cause fix: stop leaning on an imperceptible navy delta and a play-only
 * particle layer. The stage now carries a layered, always-on ambient backdrop:
 *   - a depth gradient from the elevated navy center out to `--neo-abyss`
 *     (#0a0a1a) at the edges — a real vignette that makes the board pop, and
 *   - soft brand-colored glows (lime + cyan + violet) that give genuine ambient
 *     energy on EVERY phase (ready / playing / results), independent of pixi.
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
  it('gives the stage a layered ambient backdrop: depth-to-abyss vignette + brand glows', async () => {
    render(<WordWheelChallenge />);

    const stage = await waitFor(() => screen.getByTestId('word-wheel-stage'));
    const bg = stage.style.background;

    // Depth layer: elevated navy center vignetting out to the deep-space abyss
    // edge (#0a0a1a) — a perceptible vignette, NOT the old navy-only delta that
    // sat too close to the edge and read as flat black.
    expect(bg).toContain('radial-gradient');
    expect(bg).toContain('--neo-navy-elevated');
    expect(bg).toContain('--neo-abyss');
    expect(bg).not.toContain('--neo-navy-radial');

    // Ambient color: soft brand glows give phase-independent "ambient feel"
    // instead of leaning on the play-only pixi bokeh. Lime + cyan at minimum.
    expect(bg).toContain('rgba(191,255,0'); // lime glow
    expect(bg).toContain('rgba(0,255,255'); // cyan glow

    // Perceptibility floor. The first pass used ~0.07–0.10 alphas, which over a
    // navy→abyss vignette still read as flat black on-device. The glows must be
    // strong enough to give genuine ambient color, not an imperceptible tint.
    const limeAlpha = Number(bg.match(/rgba\(191,255,0,\s*([0-9.]+)/)?.[1]);
    const cyanAlpha = Number(bg.match(/rgba\(0,255,255,\s*([0-9.]+)/)?.[1]);
    expect(limeAlpha).toBeGreaterThanOrEqual(0.16);
    expect(cyanAlpha).toBeGreaterThanOrEqual(0.12);
  });
});
