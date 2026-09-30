/**
 * The calm dial (leaderboard: hidden) on the between-rounds results screen:
 * my card keeps MY score, word and earnings, but never the class placing —
 * no rank stamp, no winner framing, no tied/ahead/behind line, and the
 * mascot stays neutral (a victory face IS the placing).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MpMyCard, type MpMyCardProps } from '../MpMyCard';

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (p: Record<string, unknown>) => <img {...(p as React.ImgHTMLAttributes<HTMLImageElement>)} />,
}));

vi.mock('@/components/ui/AnimatedCounter', () => ({
  default: ({ value }: { value: number }) => <span>{value}</span>,
}));

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const base: MpMyCardProps = {
  rank: 1,
  winner: true,
  total: 4,
  score: 240,
  bestWord: { word: 'aet', score: 12 },
  xp: 15,
  coins: 10,
  gap: { kind: 'ahead', name: 'Noa', points: 40 },
  revealed: true,
  t,
};

describe('MpMyCard — hideClassPosition (leaderboard hidden, intermission)', () => {
  it('keeps own score, word, xp and coins', () => {
    render(<MpMyCard {...base} hideClassPosition />);
    expect(screen.getByTestId('mp-my-score')).toHaveTextContent('240');
    expect(screen.getByTestId('mp-my-best-word')).toBeInTheDocument();
    expect(screen.getByTestId('mp-my-xp')).toBeInTheDocument();
    expect(screen.getByTestId('mp-my-coins')).toBeInTheDocument();
  });

  it('prints no rank stamp, no winner framing, no rival gap', () => {
    render(<MpMyCard {...base} hideClassPosition />);
    expect(screen.queryByTestId('mp-my-rank')).toBeNull();
    const card = screen.getByTestId('mp-my-card');
    expect(card.dataset.winner).toBe('false');
    expect(card).not.toHaveTextContent('mpUi.results.winner');
    expect(card).not.toHaveTextContent('mpUi.results.placeOf');
    expect(card).not.toHaveTextContent('mpUi.results.ahead');
    expect(card).not.toHaveTextContent('mpUi.results.tiedWith');
  });

  it('uses the neutral mascot, never the victory or loser face', () => {
    const { container } = render(<MpMyCard {...base} hideClassPosition />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).not.toContain('victory');
    expect(img?.getAttribute('src')).not.toContain('oops');
  });

  it('defaults to the full placing treatment (the final reveal)', () => {
    render(<MpMyCard {...base} />);
    expect(screen.getByTestId('mp-my-rank')).toHaveTextContent('#1');
    expect(screen.getByTestId('mp-my-card')).toHaveTextContent('mpUi.results.winner');
  });
});
