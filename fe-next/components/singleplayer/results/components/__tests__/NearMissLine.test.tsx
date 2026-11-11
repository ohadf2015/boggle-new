import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NearMissLine } from '../NearMissLine';

const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => track(...a) }));

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key} ${Object.values(params).join(' ')}` : key;

describe('NearMissLine', () => {
  beforeEach(() => track.mockReset());

  it('Given a best near-miss, When rendered, Then it says how close and tracks the impression once', () => {
    const { rerender } = render(<NearMissLine nearMiss={{ kind: 'best', gap: 3 }} mode="solo-bots" t={t} />);
    expect(screen.getByTestId('sp-near-miss')).toHaveTextContent('singlePlayer.nearMiss.best 3');
    rerender(<NearMissLine nearMiss={{ kind: 'best', gap: 3 }} mode="solo-bots" t={t} />);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('sp_near_miss_shown', { kind: 'best', gap: 3, mode: 'solo-bots' });
  });

  it('Given a rival near-miss, When rendered, Then it names the bot just above', () => {
    render(<NearMissLine nearMiss={{ kind: 'rival', gap: 2, name: 'Robo' }} mode="solo-bots" t={t} />);
    expect(screen.getByTestId('sp-near-miss')).toHaveTextContent('singlePlayer.nearMiss.rival 2 Robo');
  });

  it('Given a new best, When rendered, Then it celebrates instead of showing a gap', () => {
    render(<NearMissLine nearMiss={{ kind: 'newBest' }} mode="daily" t={t} />);
    const line = screen.getByTestId('sp-near-miss');
    expect(line).toHaveAttribute('data-kind', 'newBest');
    expect(line).toHaveTextContent('singlePlayer.nearMiss.newBest');
    expect(track).toHaveBeenCalledWith('sp_near_miss_shown', { kind: 'newBest', gap: 0, mode: 'daily' });
  });

  it('Given no near-miss, When rendered, Then nothing shows and nothing is tracked', () => {
    const { container } = render(<NearMissLine nearMiss={null} mode="solo-bots" t={t} />);
    expect(container).toBeEmptyDOMElement();
    expect(track).not.toHaveBeenCalled();
  });
});
