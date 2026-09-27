/**
 * The projector podium stands the top three ON the pedestals painted in
 * podium-bg — winner on gold in the centre, silver left, bronze right.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: { div: 'div', span: 'span', p: 'p' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => true,
}));

import { PodiumStage, PEDESTALS } from '../PodiumStage';
import { FINAL_STAGE } from '@/lib/education/roundEndStage';

const t = (key: string) => key;
const entries = [
  { username: 'Maya', score: 120, rank: 1, detail: '4 of 5 words' },
  { username: 'Leo', score: 90, rank: 2 },
  { username: 'Noa', score: 60, rank: 3 },
];

describe('PodiumStage', () => {
  afterEach(cleanup);

  it('paints the podium art as a decorative, eager image', () => {
    render(<PodiumStage entries={entries} stage={FINAL_STAGE} t={t} />);
    const art = screen.getByTestId('podium-stage-art');
    expect(art.getAttribute('src')).toContain('/images/education/podium-bg.webp');
    expect(art).toHaveAttribute('alt', '');
  });

  it('keeps the placings in rank order for a screen reader', () => {
    render(<PodiumStage entries={[entries[2], entries[0], entries[1]]} stage={FINAL_STAGE} t={t} />);
    const places = screen.getAllByTestId(/^podium-place-/).map((el) => el.getAttribute('data-rank'));
    expect(places).toEqual(['1', '2', '3']);
  });

  it('stands gold in the middle, silver left, bronze right — never mirrored in RTL', () => {
    render(<PodiumStage entries={entries} stage={FINAL_STAGE} t={t} />);
    expect(screen.getByTestId('podium-stage')).toHaveAttribute('dir', 'ltr');
    expect(PEDESTALS[2].x).toBeLessThan(PEDESTALS[1].x);
    expect(PEDESTALS[1].x).toBeLessThan(PEDESTALS[3].x);
    // Gold stands tallest in the art: its top is highest on the canvas.
    expect(PEDESTALS[1].top).toBeLessThan(PEDESTALS[2].top);
    expect(PEDESTALS[2].top).toBeLessThan(PEDESTALS[3].top);
  });

  it('steps the plinth heights and uses a min-height, never a fixed one', () => {
    render(<PodiumStage entries={entries} stage={FINAL_STAGE} t={t} />);
    const h = (r: number) => Number(screen.getByTestId(`podium-place-${r}`).getAttribute('data-plinth-height'));
    expect(h(1)).toBeGreaterThan(h(2));
    expect(h(2)).toBeGreaterThan(h(3));
    const plinth = screen.getByTestId('podium-place-3').querySelector<HTMLElement>('[style*="min-height"]');
    expect(plinth?.style.minHeight).toBeTruthy();
    expect(plinth?.style.height).toBe('');
  });

  it('prints name and final score once revealed (count-up lands on the real number)', () => {
    render(<PodiumStage entries={entries} stage={FINAL_STAGE} t={t} />);
    const first = screen.getByTestId('podium-place-1');
    expect(first).toHaveTextContent('Maya');
    expect(first).toHaveTextContent('120');
    expect(first).toHaveTextContent('4 of 5 words');
  });

  it('hides an unrevealed placing from the a11y tree and shows a placeholder', () => {
    render(<PodiumStage entries={entries} stage="stage" t={t} />);
    const first = screen.getByTestId('podium-place-1');
    expect(first).toHaveAttribute('aria-hidden', 'true');
    expect(first).not.toHaveTextContent('Maya');
  });

  it('gives every revealed student a face', () => {
    render(<PodiumStage entries={entries} stage={FINAL_STAGE} t={t} />);
    expect(screen.getAllByTestId('podium-avatar')).toHaveLength(3);
  });

  it('orders pedestals by SCORE even when the server ranks contradict it', () => {
    // Given a payload where rank 2 holds fewer points than rank 3
    render(
      <PodiumStage
        entries={[
          { username: 'Maya', score: 148, rank: 1 },
          { username: 'Leo', score: 85, rank: 2 },
          { username: 'Noa', score: 87, rank: 3 },
        ]}
        stage={FINAL_STAGE}
        t={t}
      />
    );
    // Then silver carries the higher score and bronze the lower one
    expect(screen.getByTestId('podium-place-2')).toHaveTextContent('Noa');
    expect(screen.getByTestId('podium-place-2')).toHaveTextContent('87');
    expect(screen.getByTestId('podium-place-3')).toHaveTextContent('Leo');
    expect(screen.getByTestId('podium-place-3')).toHaveTextContent('85');
  });

  it('dresses each placing in its own metal — gold, silver, bronze — with a medal', () => {
    render(<PodiumStage entries={entries} stage={FINAL_STAGE} t={t} />);
    expect(screen.getByTestId('podium-place-1')).toHaveAttribute('data-medal', 'gold');
    expect(screen.getByTestId('podium-place-2')).toHaveAttribute('data-medal', 'silver');
    expect(screen.getByTestId('podium-place-3')).toHaveAttribute('data-medal', 'bronze');
    expect(screen.getAllByTestId(/^podium-medal-/)).toHaveLength(3);
    // Three distinct plate fills: the metals are told apart by colour, not by digit alone.
    const fills = [1, 2, 3].map(
      (r) => screen.getByTestId(`podium-plate-${r}`).className.match(/bg-\S+/)?.[0]
    );
    expect(new Set(fills).size).toBe(3);
  });
});
