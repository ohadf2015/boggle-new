/**
 * Tests for the ready-screen preview wheel censoring in WordWheelChallenge.
 *
 * Requirements:
 * - The preview wheel renders one tile per outer letter (6).
 * - Outer letters are censored with a BLUR effect (not a pixel mosaic), so the
 *   real letters MUST NOT appear in the DOM — the pre-game scout still can't
 *   read them by inspecting the markup.
 * - The center letter remains visible (it's the only revealed glyph).
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import WordWheelChallenge from '../WordWheelChallenge';

// --- next/dynamic: render nothing for the lazy effects canvas ---
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Stub = () => null;
    Stub.displayName = 'DynamicStub';
    return Stub;
  },
}));

// --- framer-motion: pass-through ---
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

// --- Contexts ---
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ setGameActive: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: null, isAuthenticated: false }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

// --- Utils ---
vi.mock('@/utils/dailyChallenge', () => ({
  hasEverPlayedWordWheel: () => false,
  getDailyChallengeDate: () => '2026-04-15',
  getPuzzleNumber: () => 42,
  hasPlayedWordWheelToday: () => false,
  getTodaysWordWheelResult: () => null,
  saveWordWheelResult: vi.fn(),
  hasPlayedWordHuntToday: () => false,
  getDailyStreak: () => ({ currentStreak: 0 }),
  updateDailyStreak: vi.fn(() => ({ currentStreak: 1, longestStreak: 1, lastPlayedDate: null, totalDailiesCompleted: 1 })),
}));

const OUTER_LETTERS = ['B', 'C', 'D', 'E', 'F', 'G'];
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  generateWordWheelPuzzle: () => ({
    centerLetter: 'A',
    outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
    validWords: [],
  }),
}));
vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: () => 'test-fp',
}));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    showAd: vi.fn(),
    isAdAvailable: false,
    isPlaceholderCooldown: false,
  }),
}));

// --- Child components ---
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

describe('WordWheelChallenge - preview wheel censoring', () => {
  it('GIVEN ready state THEN renders one censored tile per outer letter', async () => {
    render(<WordWheelChallenge />);
    const tiles = await waitFor(() => {
      const found = screen.getAllByTestId('preview-outer-letter');
      expect(found).toHaveLength(6);
      return found;
    });
    expect(tiles).toHaveLength(6);
  });

  it('GIVEN ready state THEN the real outer letters are NOT present in the censored tiles', async () => {
    render(<WordWheelChallenge />);
    const tiles = await waitFor(() => screen.getAllByTestId('preview-outer-letter'));
    for (const tile of tiles) {
      for (const letter of OUTER_LETTERS) {
        expect(within(tile).queryByText(letter)).toBeNull();
      }
    }
  });

  it('GIVEN ready state THEN the center letter is revealed', async () => {
    render(<WordWheelChallenge />);
    await waitFor(() => screen.getAllByTestId('preview-outer-letter'));
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('GIVEN ready state THEN each tile censors with a blur filter (not a pixel mosaic)', async () => {
    render(<WordWheelChallenge />);
    const tiles = await waitFor(() => screen.getAllByTestId('preview-outer-letter'));
    for (const tile of tiles) {
      const blurred = within(tile).getByTestId('censor-blur');
      expect(blurred.getAttribute('style') || '').toContain('blur(');
    }
  });
});
