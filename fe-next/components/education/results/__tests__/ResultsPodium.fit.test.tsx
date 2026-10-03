import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResultsPodium, type PodiumEntry } from '../ResultsPodium';

const t = (k: string) => k;
const entries: PodiumEntry[] = [
  { username: 'Eli', score: 1021, rank: 1, detail: '6 correct' },
  { username: 'Ido', score: 1018, rank: 2, detail: '6 correct' },
  { username: 'Zoe', score: 0, rank: 3, detail: '0 correct' },
];
const plinthOf = (rank: number) =>
  screen.getByTestId(`podium-place-${rank}`).querySelector<HTMLElement>('[data-plinth]')!;

describe('ResultsPodium — fits the screen it is on', () => {
  it('Given the row layout (a phone end screen), Then the three plinths stand side by side, winner in the middle', () => {
    render(<ResultsPodium entries={entries} layout="row" t={t} />);
    const list = screen.getByRole('list');
    expect(list.className).toContain('flex-row');
    expect(list.className).not.toMatch(/(^| )flex-col( |$)/);
    expect(screen.getByTestId('podium-place-1').className).toMatch(/(^| )order-2( |$)/);
    expect(screen.getByTestId('podium-place-2').className).toMatch(/(^| )order-1( |$)/);
    expect(screen.getByTestId('podium-place-3').className).toMatch(/(^| )order-3( |$)/);
  });

  it('Given the row layout, Then the plinths are short enough to share a phone screen and still step', () => {
    render(<ResultsPodium entries={entries} layout="row" t={t} />);
    const h = (rank: number) => Number(screen.getByTestId(`podium-place-${rank}`).dataset.plinthHeight);
    expect(h(1)).toBeLessThanOrEqual(5);
    expect(h(1)).toBeGreaterThan(h(2));
    expect(h(2)).toBeGreaterThan(h(3));
  });

  it('Given the projector size, Then every plinth height is capped by the viewport height', () => {
    render(<ResultsPodium entries={entries} size="projector" t={t} />);
    for (const rank of [1, 2, 3]) expect(plinthOf(rank).className).toMatch(/min-h-\[min\(\d+(\.\d+)?rem,\d+dvh\)\]/);
  });

  it('Given the projector size, Then the crown has room above the winner inside the podium box', () => {
    render(<ResultsPodium entries={entries} size="projector" t={t} />);
    expect(screen.getByRole('list').className).toContain('pt-10');
  });

  it('Given the default card layout, Then the stacked-then-row behaviour is unchanged', () => {
    render(<ResultsPodium entries={entries} t={t} />);
    expect(screen.getByRole('list').className).toContain('sm:flex-row');
    expect(screen.getByTestId('podium-place-1').className).toContain('sm:order-2');
  });
});
