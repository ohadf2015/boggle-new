import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResultsRivalsPanel from '@/components/results/ResultsRivalsPanel';

// Pixi burst is a side garnish; stub it so jsdom never touches WebGL.
vi.mock('@/components/results/RivalVictorySparks', () => ({
  default: () => <div data-testid="victory-sparks" />,
}));

const t = (k: string, p?: Record<string, string | number>) =>
  p ? `${k}:${Object.values(p).join(',')}` : k;

const players = [
  { username: 'Me', score: 300, allWords: [{ word: 'cat', score: 3, validated: true, isDuplicate: false }] },
  { username: 'Bob', score: 280 },
  { username: 'Ann', score: 120 },
] as never[];

describe('ResultsRivalsPanel', () => {
  it('renders nothing for a solo game (no rivals)', () => {
    const { container } = render(
      <ResultsRivalsPanel sortedScores={[players[0]]} username="Me" t={t} reducedMotion={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows my true global rank and total players', () => {
    render(<ResultsRivalsPanel sortedScores={players} username="Me" t={t} reducedMotion={false} />);
    // I am rank 1 of 3
    expect(screen.getByTestId('rivals-my-rank')).toHaveTextContent('1');
    expect(screen.getByTestId('rivals-total')).toHaveTextContent('3');
  });

  it('labels a rival I beat as "behind me" (lime) and one ahead as "ahead"', () => {
    // Make me 2nd: Bob ahead, Ann behind
    const mid = [
      { username: 'Bob', score: 320 },
      { username: 'Me', score: 300, allWords: [] },
      { username: 'Ann', score: 120 },
    ] as never[];
    render(<ResultsRivalsPanel sortedScores={mid} username="Me" t={t} reducedMotion={false} />);
    expect(screen.getByTestId('rivals-row-Bob')).toHaveAttribute('data-direction', 'ahead');
    expect(screen.getByTestId('rivals-row-Ann')).toHaveAttribute('data-direction', 'behind');
  });

  it('marks the won state (data-won) when I finished first', () => {
    render(<ResultsRivalsPanel sortedScores={players} username="Me" t={t} reducedMotion={false} />);
    expect(screen.getByTestId('results-rivals-panel')).toHaveAttribute('data-won', 'true');
  });

  it('does not mark won when I did not finish first', () => {
    const mid = [
      { username: 'Bob', score: 320 },
      { username: 'Me', score: 300, allWords: [] },
    ] as never[];
    render(<ResultsRivalsPanel sortedScores={mid} username="Me" t={t} reducedMotion={false} />);
    expect(screen.getByTestId('results-rivals-panel')).toHaveAttribute('data-won', 'false');
  });

  it('surfaces a unique-words line when allPlayerWords shows words only I found', () => {
    const allPlayerWords = {
      Me: [{ word: 'zephyr', score: 9, validated: true, isDuplicate: false }],
      Bob: [{ word: 'cat', score: 3, validated: true, isDuplicate: false }],
    } as never;
    render(
      <ResultsRivalsPanel
        sortedScores={players}
        username="Me"
        t={t}
        reducedMotion={false}
        allPlayerWords={allPlayerWords}
      />,
    );
    expect(screen.getByTestId('rivals-unique-line')).toBeInTheDocument();
  });

  it('omits the unique-words line when no unique words exist', () => {
    render(<ResultsRivalsPanel sortedScores={players} username="Me" t={t} reducedMotion={false} />);
    expect(screen.queryByTestId('rivals-unique-line')).not.toBeInTheDocument();
  });
});
