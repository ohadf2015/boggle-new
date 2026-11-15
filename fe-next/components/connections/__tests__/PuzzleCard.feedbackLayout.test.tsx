import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PuzzleCard from '../PuzzleCard';
import type { ConnectionPuzzle } from '@/lib/connections/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he', isRTL: true }),
}));
vi.mock('@/contexts/AdMobContext', () => ({
  useAdMobContext: () => ({ showRewarded: async () => true, isReady: true }),
}));
vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ unlock: async () => true, isUnlocking: false }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

/**
 * Player report 2026-11-15 (/he/daily): the hint pill sat flush on the keyboard,
 * and a "wrong answer" label shared its row, squeezing the hint into two lines.
 * Root cause: one AnimatePresence mode="wait" held hint AND verdict as siblings;
 * "wait" only serialises a single child, so both rendered side by side in a
 * fixed-height (h-10) row. The verdict now has its own line above the stage and
 * the hint its own full-width row, spaced off the keyboard dock.
 */
const puzzle = {
  id: 'p1',
  word1: 'BEACH',
  bridge: 'COMB',
  word2: 'OVER',
  hint: 'a long hint that should wrap gracefully across two lines on a small phone screen',
  difficulty: 'medium',
} as unknown as ConnectionPuzzle;

const mk = (over: Record<string, unknown>) =>
  ({
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
    ...over,
  }) as unknown as Parameters<typeof PuzzleCard>[0]['state'];

const noop = () => {};
const renderCard = (over: Record<string, unknown>) =>
  render(
    <PuzzleCard puzzle={puzzle} state={mk(over)} isAdmin={false} onInputChange={noop} onSubmit={noop}
      onGiveUp={noop} onRevealHint={noop} onRate={noop} onNext={noop} />,
  );

describe('PuzzleCard — hint and wrong-answer layout', () => {
  it('renders the wrong-answer verdict outside the hint row', () => {
    renderCard({ status: 'wrong', wrongAttempts: 1, hintRevealed: true });
    const hintRow = screen.getByTestId('puzzle-hint-row');
    const wrong = screen.getByText('connections.wrong');
    expect(hintRow.contains(wrong)).toBe(false);
    expect(hintRow.textContent).toContain(puzzle.hint);
  });

  it('places the verdict before the stage and the hint row after it', () => {
    renderCard({ status: 'wrong', wrongAttempts: 1, hintRevealed: true });
    const stage = screen.getByTestId('puzzle-stage');
    const wrong = screen.getByText('connections.wrong');
    const hintRow = screen.getByTestId('puzzle-hint-row');
    expect(wrong.compareDocumentPosition(stage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(stage.compareDocumentPosition(hintRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('gives the hint row a bottom gap above the keyboard and logical-only spacing', () => {
    renderCard({ hintRevealed: true });
    const cls = screen.getByTestId('puzzle-hint-row').className;
    expect(cls).toMatch(/\bmb-\d/);
    expect(cls).not.toMatch(/\b(ml|mr|pl|pr)-/);
  });

  it('reserves the hint row before the hint is shown so nothing jumps', () => {
    renderCard({ hintRevealed: false });
    expect(screen.getByTestId('puzzle-hint-row').className).toMatch(/min-h-/);
    expect(screen.queryByText(puzzle.hint as string)).toBeNull();
  });
});
