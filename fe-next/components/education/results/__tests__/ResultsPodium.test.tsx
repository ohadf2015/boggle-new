/**
 * The podium.
 *
 * End of a classroom game is a moment, not a report. Before any coverage
 * table, the room sees three names on three plinths — the winner in the middle
 * and tallest, exactly the shape a class reads without being told.
 *
 * Shared by the board-game results card and the Vocab Quiz projector so the two
 * modes celebrate identically.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ResultsPodium } from '../ResultsPodium';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const three = [
  { username: 'Maya', score: 90, rank: 1, detail: '3/4' },
  { username: 'Noa', score: 70, rank: 2, detail: '2/4' },
  { username: 'Eitan', score: 50, rank: 3, detail: '1/4' },
];

describe('ResultsPodium', () => {
  it('shows every finisher with their name and score', () => {
    render(<ResultsPodium entries={three} t={t} />);
    for (const entry of three) {
      const plinth = screen.getByTestId(`podium-place-${entry.rank}`);
      expect(plinth).toHaveTextContent(entry.username);
      expect(plinth).toHaveTextContent(String(entry.score));
    }
  });

  it('reads first, second, third in the DOM even though first is drawn in the middle', () => {
    render(<ResultsPodium entries={three} t={t} />);
    const names = screen.getAllByTestId(/^podium-place-/).map((el) => el.dataset.rank);
    expect(names).toEqual(['1', '2', '3']);
  });

  it('draws the winner in the centre column on a wide screen', () => {
    render(<ResultsPodium entries={three} t={t} />);
    expect(screen.getByTestId('podium-place-1').className).toContain('sm:order-2');
    expect(screen.getByTestId('podium-place-2').className).toContain('sm:order-1');
    expect(screen.getByTestId('podium-place-3').className).toContain('sm:order-3');
  });

  it('gives the winner the tallest plinth', () => {
    render(<ResultsPodium entries={three} t={t} />);
    const height = (rank: number) =>
      Number(screen.getByTestId(`podium-place-${rank}`).getAttribute('data-plinth-height'));
    expect(height(1)).toBeGreaterThan(height(2));
    expect(height(2)).toBeGreaterThan(height(3));
  });

  it('reveals the plinths in reverse order — third, second, then the winner', () => {
    render(<ResultsPodium entries={three} t={t} />);
    const delay = (rank: number) =>
      parseFloat(screen.getByTestId(`podium-place-${rank}`).style.animationDelay);
    expect(delay(3)).toBeLessThan(delay(2));
    expect(delay(2)).toBeLessThan(delay(1));
  });

  it('renders a two-player room without inventing a third place', () => {
    render(<ResultsPodium entries={three.slice(0, 2)} t={t} />);
    expect(screen.getByTestId('podium-place-1')).toBeInTheDocument();
    expect(screen.getByTestId('podium-place-2')).toBeInTheDocument();
    expect(screen.queryByTestId('podium-place-3')).not.toBeInTheDocument();
  });

  it('renders nothing at all when the room had no human finishers', () => {
    const { container } = render(<ResultsPodium entries={[]} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('omits the sub-line for a finisher with no detail rather than printing a blank', () => {
    render(<ResultsPodium entries={[{ username: 'LateJoiner', score: 5, rank: 1 }]} t={t} />);
    expect(screen.getByTestId('podium-place-1')).toHaveTextContent('LateJoiner');
    expect(screen.queryByTestId('podium-detail-1')).not.toBeInTheDocument();
  });

  it('labels the podium for screen readers', () => {
    render(<ResultsPodium entries={three} t={t} />);
    expect(screen.getByRole('list', { name: 'education.results.podium.title' })).toBeInTheDocument();
  });

  it('never animates for a viewer who asked for reduced motion', () => {
    render(<ResultsPodium entries={three} t={t} />);
    expect(screen.getByTestId('podium-place-1').className).toContain('motion-reduce:animate-none');
  });
});
