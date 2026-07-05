import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordTowerStatHud } from '../WordTowerStatHud';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

describe('WordTowerStatHud', () => {
  it('always shows the rounded altitude; biome + floors hide behind the expand toggle', () => {
    render(<WordTowerStatHud heightM={42.7} biomeId="city" floorsCount={5} personalBestM={0} combo={1} t={t} />);
    expect(screen.getByText('43')).toBeInTheDocument(); // toFixed(0), the hero
    // Simplified by default (#4): the biome/floor detail is not shown until expanded.
    expect(screen.queryByText(/wordTower\.biome\.city/)).toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/wordTower\.biome\.city/)).toBeInTheDocument();
  });

  it('shows the compact best chip (once expanded) only when a personal best exists', () => {
    const { rerender } = render(<WordTowerStatHud heightM={10} biomeId="city" floorsCount={1} personalBestM={0} combo={1} t={t} />);
    fireEvent.click(screen.getByRole('button')); // expand the detail row
    expect(screen.queryByText('88')).toBeNull();
    rerender(<WordTowerStatHud heightM={10} biomeId="city" floorsCount={1} personalBestM={88} combo={1} t={t} />);
    // Stays expanded across the rerender; the best chip's number is now visible.
    expect(screen.getByText('88')).toBeInTheDocument();
  });

  it('surfaces the combo streak chip only when the chain is above 1', () => {
    const { rerender } = render(<WordTowerStatHud heightM={10} biomeId="city" floorsCount={1} personalBestM={0} combo={1} t={t} />);
    expect(screen.queryByText(/×/)).toBeNull();
    rerender(<WordTowerStatHud heightM={10} biomeId="city" floorsCount={1} personalBestM={0} combo={4} t={t} />);
    expect(screen.getByText(/×/)).toBeInTheDocument();
  });
});
