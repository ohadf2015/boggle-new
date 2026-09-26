/**
 * MpMyCard: the best-word chip must SAY it is the best word. A bare
 * "★ AET +12" read as an unexplained code in the r102 captures.
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
  rank: 2,
  winner: false,
  total: 4,
  score: 12,
  bestWord: { word: 'aet', score: 12 },
  xp: null,
  coins: 10,
  gap: null,
  revealed: true,
  t,
};

describe('MpMyCard best word chip', () => {
  it('Given a best word, When the card is revealed, Then the chip shows a VISIBLE best-word label next to the word', () => {
    render(<MpMyCard {...base} />);
    const chip = screen.getByTestId('mp-my-best-word');
    const label = chip.querySelector('[data-testid="mp-my-best-word-label"]');
    expect(label).not.toBeNull();
    expect(label!.textContent).toBe('mpUi.results.bestWord');
    expect(label!.className).not.toMatch(/\bsr-only\b/);
    expect(chip.textContent).toContain('aet');
    expect(chip.textContent).toContain('+12');
  });

  it('Given no best word, When rendered, Then no best-word chip is shown', () => {
    render(<MpMyCard {...base} bestWord={null} />);
    expect(screen.queryByTestId('mp-my-best-word')).toBeNull();
  });
});

describe('MpMyCard points in RTL', () => {
  it('Given a best word, Then its "+N" is an LTR island (never "12+" in Hebrew)', () => {
    render(<MpMyCard {...base} />);
    expect(screen.getByTestId('mp-my-best-word').querySelector('[dir="ltr"]')?.textContent).toBe('+12');
  });
});
