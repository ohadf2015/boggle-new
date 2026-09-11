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

  /**
   * The staged bottom-up reveal is GONE on purpose — see the static-paint test
   * below. Rank order is now carried by the DOM, which is what a screen reader
   * reads out and what a phone stacks, instead of by an animation timeline.
   */
  it('lists the finishers in rank order in the DOM, winner first', () => {
    render(<ResultsPodium entries={three} t={t} />);
    const ranks = screen
      .getAllByTestId(/^podium-place-/)
      .map((el) => el.getAttribute('data-rank'));
    expect(ranks).toEqual(['1', '2', '3']);
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

  /**
   * Capture r2: the a11y tree read "WE HAVE A WINNER!" with all three names
   * while a screenshot taken in the same instant showed nothing painted. The
   * cause was here — `animate-neo-pop` starts at `opacity: 0`, and the plinths
   * carried staged `animationDelay` up to 0.45s with `animationFillMode:
   * 'both'`, whose BACKWARDS fill holds that invisible 0% frame through the
   * delay. The winner's plinth was blank for ~450ms and unsettled until ~850ms.
   * Pitfall Class 5 verbatim: an entrance opacity tween on a large surface.
   *
   * The podium now appears statically. It is still loud — colour-coded
   * plinths, tilt, crown, hard shadows — it just never starts invisible.
   */
  it('paints the moment it mounts — no entrance fade, on any plinth', () => {
    render(<ResultsPodium entries={three} t={t} />);
    for (const rank of [1, 2, 3]) {
      const plinth = screen.getByTestId(`podium-place-${rank}`);
      expect(plinth.className).not.toContain('animate-neo-pop');
      expect(plinth.style.opacity).not.toBe('0');
      expect(plinth.style.animationDelay).toBe('');
    }
  });

  it('paints statically on the projector too, where the delay staging was worst', () => {
    render(<ResultsPodium entries={three} size="projector" t={t} />);
    expect(screen.getByTestId('podium-place-1').className).not.toContain('animate-');
  });
});
