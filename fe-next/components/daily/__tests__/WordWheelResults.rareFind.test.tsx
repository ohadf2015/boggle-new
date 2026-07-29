/**
 * WordWheelResults "rarest find" celebration.
 *
 * After the round, the results screen pulls the day's distinct-player count per
 * word and celebrates the player's rarest find — "only you found X (so far)" or
 * "rare find: only N players found X". Daily play is async, so the copy is
 * honest about "so far" and the helper suppresses meaningless exclusivity
 * (see lib/wordWheel/wordRarity). These tests pin the wiring + gating.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WordWheelResults from '../WordWheelResults';
import type { WordWheelGameResult } from '../WordWheelGame';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  }),
  animate: () => ({ stop: () => {} }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../TabbedDailyLeaderboard', () => ({ __esModule: true, default: () => <div data-testid="leaderboard-stub" /> }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound: vi.fn() }) }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string | number> | string) => (typeof p === 'string' ? p : k), language: 'en' }),
}));
vi.mock('@/hooks/usePracticeFlag', () => ({ usePracticeFlag: () => false }));
vi.mock('../DailyInsightStack', () => ({ __esModule: true, default: () => <div data-testid="insight-stack" /> }));

const mockCounts = (counts: Record<string, number>) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ counts }),
  }) as unknown as typeof fetch;
};

const result: WordWheelGameResult = { score: 40, wordsFound: ['CAT', 'CANTER'], timeSeconds: 60 };

const renderResults = (r: WordWheelGameResult = result) =>
  render(
    <WordWheelResults
      result={r}
      puzzleNumber={42}
      puzzleDate="2026-05-18"
      language="en"
      hasPlayedWordHunt={false}
      currentPlayerId="me"
    />,
  );

beforeEach(() => vi.clearAllMocks());

describe('WordWheelResults — rarest find celebration', () => {
  it('celebrates an exclusive find once a real field has played', async () => {
    mockCounts({ CAT: 6, CANTER: 1 }); // CANTER only by this player; field is real
    renderResults();
    const card = await screen.findByTestId('word-wheel-rare-find');
    expect(card).toHaveTextContent('CANTER');
    expect(card).toHaveAttribute('data-exclusive', 'true');
  });

  it('celebrates a rare-but-shared find', async () => {
    mockCounts({ CAT: 40, CANTER: 3 });
    renderResults();
    const card = await screen.findByTestId('word-wheel-rare-find');
    expect(card).toHaveTextContent('CANTER');
    expect(card).toHaveAttribute('data-exclusive', 'false');
  });

  it('does not render when the rarest find is still common', async () => {
    mockCounts({ CAT: 40, CANTER: 18 });
    renderResults();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByTestId('word-wheel-rare-find')).toBeNull();
  });

  it('does not render when the rarity fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    renderResults();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByTestId('word-wheel-rare-find')).toBeNull();
  });
});
