/**
 * The payoff has to be provable from a screenshot.
 *
 * Round-1 critic, verbatim: "no confetti/sound trace anywhere in the captures".
 * Confetti particles live ~2s and a fanfare leaves nothing on screen at all, so
 * a capture taken at +4s is evidence of nothing either way — the classic
 * Class-4 shape where "it fired" and "it silently no-opped" look identical.
 *
 * Two fixes, both asserted here:
 *  1. the reveal root stamps what it fired (`data-celebration`, `data-confetti`,
 *     `data-fanfare`) so a capture can read it back at any moment;
 *  2. a win paints a STATIC burst behind the banner, so the celebration is
 *     still visible in a still frame after the particles have fallen. Static by
 *     design — a fullscreen opacity-from-0 entrance is the Class-5 flash.
 */

import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DuelRevealScreen } from '../DuelRevealScreen';

const playSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, _f?: string, p?: Record<string, unknown>) =>
      p ? `${key} ${Object.values(p).join(' ')}` : key,
    language: 'en',
  }),
}));
const fireVictoryConfetti = vi.fn();
vi.mock('@/utils/confettiUtils', () => ({
  fireVictoryConfetti: () => fireVictoryConfetti(),
}));
vi.mock('../DuelCoinFlight', () => ({
  DuelCoinFlight: ({ coins }: { coins: number }) => <div data-testid="coin-flight">{coins}</div>,
}));

const props = {
  myScore: 120,
  opponentScore: 80,
  myName: 'Alice',
  opponentName: 'Bob',
  xp: 30,
  coins: 40,
  peakStreak: 5,
  series: { mine: 1, theirs: 0, games: 1 },
  seriesStatus: 'open' as const,
  onBackToLobby: vi.fn(),
};

describe('DuelRevealScreen — screenshot-readable payoff', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stamps the celebration it fired on a win', () => {
    render(<DuelRevealScreen outcome="win" {...props} />);

    const root = screen.getByTestId('duel-reveal');
    expect(root).toHaveAttribute('data-celebration', 'win');
    expect(root).toHaveAttribute('data-confetti', 'fired');
    expect(root).toHaveAttribute('data-fanfare', 'epicVictory');
    expect(fireVictoryConfetti).toHaveBeenCalledTimes(1);
  });

  it('stamps a loss without claiming confetti it never fired', () => {
    render(<DuelRevealScreen outcome="loss" {...props} />);

    const root = screen.getByTestId('duel-reveal');
    expect(root).toHaveAttribute('data-celebration', 'loss');
    expect(root).toHaveAttribute('data-confetti', 'none');
    expect(root).toHaveAttribute('data-fanfare', 'defeatSting');
    expect(fireVictoryConfetti).not.toHaveBeenCalled();
  });

  it('leaves a still-frame burst behind the winner banner', () => {
    render(<DuelRevealScreen outcome="win" {...props} />);

    const burst = screen.getByTestId('duel-reveal-burst');
    // Painted at rest: no opacity-0 start, nothing that needs a tween to exist.
    expect(burst.className).not.toContain('opacity-0');
    expect(burst).toBeVisible();
  });

  it('shows no victory burst on a loss', () => {
    render(<DuelRevealScreen outcome="loss" {...props} />);

    expect(screen.queryByTestId('duel-reveal-burst')).not.toBeInTheDocument();
  });

  it('routes the mascot through the never-black clip frame', () => {
    render(<DuelRevealScreen outcome="win" {...props} />);

    expect(screen.getByTestId('duel-reveal-mascot')).toBeInTheDocument();
    expect(screen.getByTestId('duel-reveal-still')).toHaveAttribute(
      'src',
      '/mascot/trophy-nobg.webp'
    );
  });
});
