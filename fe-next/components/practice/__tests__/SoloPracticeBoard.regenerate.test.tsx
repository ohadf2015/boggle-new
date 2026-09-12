/**
 * A new board has to be a NEW board.
 *
 * `generatePlayablePracticeBoard` is deterministic for a given seed — that is
 * the point of it, and it is what makes the guard tests reproducible. The
 * consequence is that a regenerate which does not ask for a different seed
 * hands the student back the grid they just played, letter for letter: the
 * refresh button and the completion card's AGAIN both look broken while doing
 * exactly what they were told.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SoloPracticeBoard from '../SoloPracticeBoard';
import type { VocabularyWord } from '@/lib/supabase/education/types';

const generatePlayablePracticeBoard = vi.fn(() => ({
  grid: [
    ['T', 'E', 'S', 'T'],
    ['W', 'O', 'R', 'D'],
    ['H', 'E', 'L', 'P'],
    ['G', 'A', 'M', 'E'],
  ],
  embedded: ['test'],
  seed: 1,
}));

vi.mock('@/lib/education/practiceBoard', async () => {
  const actual = await vi.importActual<typeof import('@/lib/education/practiceBoard')>(
    '@/lib/education/practiceBoard',
  );
  return {
    ...actual,
    generatePlayablePracticeBoard: (opts: unknown) => generatePlayablePracticeBoard(opts as never),
  };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/GridComponent', () => ({
  default: () => <div data-testid="grid-component" />,
}));
vi.mock('@/components/game/WordFormingArea', () => ({ default: () => <div /> }));
vi.mock('@/components/ui/Mascot', () => ({ Mascot: () => null }));

const words: VocabularyWord[] = [{ word: 'test', canIntegrate: true }];

describe('SoloPracticeBoard regenerate', () => {
  beforeEach(() => generatePlayablePracticeBoard.mockClear());

  it('GIVEN a board on screen WHEN refresh is tapped THEN it asks for a different seed', () => {
    render(
      <SoloPracticeBoard
        lessonName="Week 1"
        words={words}
        language="en"
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const firstSeed = generatePlayablePracticeBoard.mock.calls[0]?.[0]?.seed;
    expect(typeof firstSeed).toBe('number');

    fireEvent.click(screen.getByLabelText('common.refresh'));

    const seeds = generatePlayablePracticeBoard.mock.calls.map((call) => call[0]?.seed);
    expect(seeds.length).toBeGreaterThan(1);
    expect(seeds[seeds.length - 1]).not.toBe(firstSeed);
  });
});
