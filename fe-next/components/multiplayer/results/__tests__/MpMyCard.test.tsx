/**
 * MpMyCard: the best-word chip must SAY it is the best word. A bare
 * "★ AET +12" read as an unexplained code in the r102 captures.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
  callout: null,
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

describe('MpMyCard callout (one rivalry line + badge)', () => {
  it('Given a photo finish I won, Then one line names the rival and margin with the photo-finish badge', () => {
    render(<MpMyCard {...base} callout={{ kind: 'photoFinish', won: true, name: 'Leo', points: 4 }} />);
    const line = screen.getByTestId('mp-my-callout');
    expect(line.dataset.kind).toBe('photoFinish');
    expect(line.textContent).toContain('mpUi.results.calloutPhotoWon:{"name":"Leo","points":4}');
    expect(line.querySelector('img')?.getAttribute('src')).toContain('badge-photo-finish');
  });

  it('Given a clear loss, Then it reuses the behind line with the lost badge', () => {
    render(<MpMyCard {...base} callout={{ kind: 'lost', name: 'Leo', points: 30 }} />);
    expect(screen.getByTestId('mp-my-callout').textContent).toContain('mpUi.results.behind:{"points":30,"name":"Leo"}');
  });

  it('Given the badge image fails to load, Then the line keeps an icon instead', () => {
    render(<MpMyCard {...base} callout={{ kind: 'comeback', places: 2 }} />);
    const img = screen.getByTestId('mp-my-callout').querySelector('img')!;
    fireEvent.error(img);
    expect(screen.getByTestId('mp-my-callout').querySelector('img')).toBeNull();
    expect(screen.getByTestId('mp-my-callout').querySelector('svg')).not.toBeNull();
  });

  it('Given only one callout slot, Then never more than one line renders', () => {
    render(<MpMyCard {...base} callout={{ kind: 'unique', count: 3 }} />);
    expect(screen.getAllByTestId('mp-my-callout')).toHaveLength(1);
  });

  it('Given hideClassPosition, Then no callout (it reveals the placing)', () => {
    render(<MpMyCard {...base} hideClassPosition callout={{ kind: 'beat', name: 'Leo', points: 30 }} />);
    expect(screen.queryByTestId('mp-my-callout')).toBeNull();
  });
});
