import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PuzzleCard from '../PuzzleCard';
import type { ConnectionPuzzle } from '@/lib/connections/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', isRTL: false }),
}));

vi.mock('@/contexts/AdMobContext', () => ({
  useAdMobContext: () => ({ showRewarded: async () => true, isReady: true }),
}));

vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ unlock: async () => true, isUnlocking: false }),
}));

/**
 * The card must be VISIBLE once mounted.
 *
 * It previously carried `animate={shakeControls}` together with an entrance on
 * `whileInView`: the explicit `animate` wins, the in-view entrance never runs,
 * and the card stays at the `initial` opacity of 0 — a fully populated DOM that
 * renders as an empty screen. One element cannot own both the entrance and the
 * shake; they need separate layers.
 */
const puzzle = {
  id: 'p1',
  word1: 'BEACH',
  bridge: 'COMB',
  word2: 'OVER',
  hint: 'h',
  difficulty: 'medium',
} as unknown as ConnectionPuzzle;

const state = {
  puzzles: [puzzle],
  currentIndex: 0,
  score: 0,
  streak: 0,
  lives: 3,
  wrongAttempts: 0,
  status: 'playing',
  input: '',
  completedIds: new Set<string>(),
  ratedIds: new Set<string>(),
  hintRevealed: false,
  attemptsPerPuzzle: 4,
} as unknown as Parameters<typeof PuzzleCard>[0]['state'];

const noop = () => {};

const renderCard = () =>
  render(
    <PuzzleCard
      puzzle={puzzle}
      state={state}
      isAdmin={false}
      onInputChange={noop}
      onSubmit={noop}
      onGiveUp={noop}
      onRevealHint={noop}
      onRate={noop}
      onNext={noop}
    />,
  );

describe('PuzzleCard — the card is actually visible', () => {
  it('does not mount stuck at opacity 0', () => {
    const { container } = renderCard();
    const card = container.querySelector('[class*="rounded-neo"]') as HTMLElement | null;
    expect(card).not.toBeNull();
    // An element left on its entrance `initial` reads back as literal "0".
    expect(card!.style.opacity).not.toBe('0');
  });

  it('renders the puzzle words to the screen', () => {
    renderCard();
    expect(screen.getByText('BEACH')).toBeTruthy();
    expect(screen.getByText('OVER')).toBeTruthy();
  });
});
