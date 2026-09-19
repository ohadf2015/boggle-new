/**
 * WordCraftPractice — Word Craft seeded by the teacher's word list.
 *
 * Only the seam is under test: the lesson's letters reach the rack, a lesson
 * word played on the REAL board ticks the checklist, and the hits reach the
 * practice session. The board/bot/territory mechanics have their own suites.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WordCraftPractice from './WordCraftPractice';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}(${Object.values(params).join(',')})` : key,
    language: 'en',
    dir: 'ltr',
    isRTL: false,
  }),
}));

// A tiny dictionary WITHOUT the lesson words: lesson words must be accepted
// because they are the lesson, not because the dictionary happens to know them.
vi.mock('@/lib/word-craft/dictionary', () => ({
  loadWordCraftDictionary: vi.fn(async () => new Set(['AX'])),
}));

vi.mock('@/components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));

const onComplete = vi.fn();
const onBack = vi.fn();

beforeEach(() => {
  onComplete.mockReset();
  onBack.mockReset();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
});

const rackTiles = () => Array.from(document.querySelectorAll<HTMLElement>('[data-rack-tile-id]'));
const rackLetters = () => rackTiles().map((el) => el.textContent?.trim().charAt(0));

/** Play `word` across from the auto-centred first tile, then submit. */
async function play(word: string) {
  const used = new Set<string>();
  let row = -1;
  let col = -1;
  for (let i = 0; i < word.length; i++) {
    const tile = rackTiles().find((el) => !used.has(el.dataset.rackTileId!) && el.textContent?.trim().startsWith(word[i]));
    if (!tile) throw new Error(`no ${word[i]} on the rack`);
    used.add(tile.dataset.rackTileId!);
    fireEvent.click(tile);
    if (i === 0) {
      const first = document.querySelector<HTMLElement>('[data-tile-state="pending"]')!;
      [row, col] = first.dataset.boardCell!.split(',').map(Number);
    } else {
      fireEvent.click(document.querySelector(`[data-board-cell="${row},${col + i}"]`)!);
    }
  }
  // Submit unlocks once the dictionary has loaded.
  await waitFor(() => expect(screen.getByLabelText('wordcraft.submit')).not.toBeDisabled());
  fireEvent.click(screen.getByLabelText('wordcraft.submit'));
}

describe('WordCraftPractice', () => {
  it('Given an unsupported language, Then it shows the unavailable panel instead of a dead board', () => {
    render(<WordCraftPractice words={['кот', 'дом']} language="ru" onComplete={onComplete} onBack={onBack} />);
    expect(screen.getByTestId('practice-insufficient-data')).toHaveAttribute('data-unavailable', 'word-craft-practice-unavailable');
  });

  it('Given a lesson, Then the opening rack holds the first lesson word and the checklist hides the words', async () => {
    render(<WordCraftPractice words={['cat', 'dog']} language="en" onComplete={onComplete} onBack={onBack} />);
    await waitFor(() => expect(rackTiles().length).toBe(7));
    for (const l of ['C', 'A', 'T']) expect(rackLetters()).toContain(l);
    const target = screen.getByTestId('word-craft-practice-target-CAT');
    expect(target).toHaveAttribute('data-hit', 'false');
    expect(target.textContent).not.toMatch(/CAT/);
  });

  it('Given the student plays a lesson word, Then it is ticked off and reported on Done', async () => {
    render(<WordCraftPractice words={['cat', 'dog']} language="en" onComplete={onComplete} onBack={onBack} />);
    await waitFor(() => expect(rackTiles().length).toBe(7));
    await play('CAT');
    await waitFor(() =>
      expect(screen.getByTestId('word-craft-practice-target-CAT')).toHaveAttribute('data-hit', 'true'),
    );

    fireEvent.click(screen.getByTestId('word-craft-practice-done'));
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ vocabularyWordsFound: ['CAT'] }),
    );
  });
});
