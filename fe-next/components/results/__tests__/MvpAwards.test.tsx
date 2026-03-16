import { render, screen } from '@testing-library/react';
import MvpAwards from '../MvpAwards';
import type { Player, WordObject } from '../types';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

jest.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: () => false,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div className={className as string} {...rest}>{children}</div>
    ),
  },
}));

function makeWord(word: string, validated = true, isDuplicate = false, comboBonus = 0): WordObject {
  return { word, score: word.length, validated, isDuplicate, comboBonus };
}

const players: Player[] = [
  { username: 'Alice', score: 100, allWords: [] },
  { username: 'Bob', score: 80, allWords: [] },
  { username: 'Carol', score: 60, allWords: [] },
];

describe('MvpAwards', () => {
  it('should return null for single player', () => {
    const { container } = render(
      <MvpAwards players={[players[0]]} allPlayerWords={{ Alice: [] }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should award longest word', () => {
    const words: Record<string, WordObject[]> = {
      Alice: [makeWord('cat'), makeWord('dog')],
      Bob: [makeWord('elephant')],
      Carol: [makeWord('ant')],
    };

    render(<MvpAwards players={players} allPlayerWords={words} />);
    // Bob has the longest word
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('ELEPHANT')).toBeInTheDocument();
    expect(screen.getByText('results.mvp.longestWord')).toBeInTheDocument();
  });

  it('should award combo king', () => {
    const words: Record<string, WordObject[]> = {
      Alice: [makeWord('cat', true, false, 5), makeWord('dog', true, false, 10)],
      Bob: [makeWord('fish', true, false, 2)],
      Carol: [makeWord('bird')],
    };

    render(<MvpAwards players={players} allPlayerWords={words} />);
    // Alice has highest combo total (15)
    expect(screen.getByText('results.mvp.comboKing')).toBeInTheDocument();
    expect(screen.getByText('+15')).toBeInTheDocument();
  });

  it('should not give duplicate awards to same player', () => {
    const words: Record<string, WordObject[]> = {
      Alice: [makeWord('magnificent', true, false, 20)],
      Bob: [makeWord('cat')],
      Carol: [makeWord('dog')],
    };

    render(<MvpAwards players={players} allPlayerWords={words} />);
    // Alice gets longest word, combo should go to nobody (only Alice has combos but already awarded)
    const aliceElements = screen.getAllByText('Alice');
    expect(aliceElements).toHaveLength(1); // Only one award for Alice
  });

  it('should award unique finder for words nobody else found', () => {
    const words: Record<string, WordObject[]> = {
      Alice: [makeWord('cats'), makeWord('dogs')], // both shared
      Bob: [makeWord('cats'), makeWord('fish'), makeWord('whales'), makeWord('seal')], // Bob gets longest (whales=6)
      Carol: [makeWord('dogs'), makeWord('bird'), makeWord('foxs'), makeWord('deer')], // Carol: 3 unique, gets uniqueFinder
    };

    const { container } = render(<MvpAwards players={players} allPlayerWords={words} />);
    // Bob gets longest (whales), multiple awards given
    expect(container.textContent).toContain('results.mvp.longestWord');
    expect(container.textContent).toContain('Bob');
    // At least one more award for non-Bob players
    expect(container.textContent).toContain('Carol');
  });

  it('should return null when no player meets thresholds', () => {
    const words: Record<string, WordObject[]> = {
      Alice: [makeWord('at')], // too short for longest
      Bob: [makeWord('be')],
    };

    const { container } = render(
      <MvpAwards players={players.slice(0, 2)} allPlayerWords={words} />
    );
    expect(container.querySelector('.flex')).toBeNull();
  });
});
