/**
 * The live "next rival" pill must reflect the day actually being played and must
 * never surface the current player as their own rival.
 *
 * Two bugs this guards:
 *  1. Wrong day on catch-up — the leaderboard fetch was hardcoded to `today`, so
 *     replaying a previous day showed today's rivals instead of that day's.
 *  2. Self as rival — when replaying a past day the player's own prior score is
 *     already on that day's board, so they saw themselves as "the player to beat".
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  // Interpolate `name` so the rival pill text is assertable.
  useLanguage: () => ({
    language: 'en',
    t: (k: string, params?: Record<string, unknown>) =>
      params && 'name' in params ? String(params.name) : k,
  }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playTileSelectSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    playComboSound: vi.fn(),
    playLegendaryWordSound: vi.fn(),
    playEpicVictorySound: vi.fn(),
    playCountdownBeep: vi.fn(),
    playButtonClickSound: vi.fn(),
    playWordLengthSound: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWordWheelKeyboard', () => ({
  useWordWheelKeyboard: () => ({ keyboardFocused: false }),
}));

vi.mock('../WordWheelPixiRing', () => ({
  __esModule: true,
  default: () => <div data-testid="pixi-ring-stub" />,
}));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="dynamic-stub" />,
}));

vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  isValidWordWheelWord: () => true,
}));

vi.mock('@/utils/dailyChallenge/wordWheelScoring', () => ({
  scoreWord: (w: string) => w.length,
}));

// Keep the rival avatar trivial so the pill text is the only thing rendered.
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <span data-testid="avatar-stub" />,
}));

import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A',
  outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
  allLetters: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  validWords: ['CAB'],
  language: 'en',
} as unknown as WordWheelPuzzle;

const renderGame = (props: Partial<React.ComponentProps<typeof WordWheelGame>> = {}) =>
  render(
    <WordWheelGame
      puzzle={puzzle}
      duration={60}
      onComplete={vi.fn()}
      onValidateWord={vi.fn().mockResolvedValue(true)}
      onEffect={vi.fn()}
      language="en"
      {...props}
    />,
  );

const mockLeaderboard = (rows: unknown[]) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: rows }),
  }) as unknown as typeof fetch;
};

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
});
afterEach(() => { vi.clearAllMocks(); });

describe('WordWheelGame rival self-filter + day scoping', () => {
  it('fetches the leaderboard for the puzzle date being played, not today', async () => {
    mockLeaderboard([]);
    renderGame({ puzzleDate: '2026-06-20' });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const url = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('/leaderboard/2026-06-20/');
  });

  it('excludes the current player (by id) from the next-rival pill', async () => {
    mockLeaderboard([
      { score: 50, display_name: 'SelfPlayer', player_id: 'me' },
      { score: 80, display_name: 'RealRival', player_id: 'other' },
    ]);
    renderGame({ puzzleDate: '2026-06-20', currentPlayerId: 'me' });
    await waitFor(() => expect(screen.getByText('RealRival')).toBeInTheDocument());
    expect(screen.queryByText('SelfPlayer')).toBeNull();
  });

  it('excludes the current guest (by fingerprint) from the next-rival pill', async () => {
    mockLeaderboard([
      { score: 50, display_name: 'SelfGuest', player_id: null, guest_fingerprint: 'fp1' },
      { score: 80, display_name: 'RealRival', player_id: 'other', guest_fingerprint: 'fp2' },
    ]);
    renderGame({ puzzleDate: '2026-06-20', currentGuestFingerprint: 'fp1' });
    await waitFor(() => expect(screen.getByText('RealRival')).toBeInTheDocument());
    expect(screen.queryByText('SelfGuest')).toBeNull();
  });
});
