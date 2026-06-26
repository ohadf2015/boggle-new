import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordTowerStatHud } from '../WordTowerStatHud';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

describe('WordTowerStatHud', () => {
  it('renders the rounded height with its biome + floor count', () => {
    render(<WordTowerStatHud heightM={42.7} biomeId="city" floorsCount={5} personalBestM={0} combo={1} t={t} />);
    expect(screen.getByText('43')).toBeInTheDocument(); // toFixed(0)
    expect(screen.getByText(/wordTower\.biome\.city/)).toBeInTheDocument();
  });

  it('shows the compact best chip only once a personal best exists', () => {
    const { rerender } = render(<WordTowerStatHud heightM={10} biomeId="city" floorsCount={1} personalBestM={0} combo={1} t={t} />);
    expect(screen.queryByLabelText(/wordTower\.hud\.best/)).toBeNull();
    rerender(<WordTowerStatHud heightM={10} biomeId="city" floorsCount={1} personalBestM={88} combo={1} t={t} />);
    // Compact trophy chip: the rounded number is the visible text, the full
    // "best" string is kept for screen readers via aria-label.
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByLabelText('wordTower.hud.best:88')).toBeInTheDocument();
  });

  it('surfaces the combo streak chip only when the chain is above 1', () => {
    const { rerender } = render(<WordTowerStatHud heightM={10} biomeId="city" floorsCount={1} personalBestM={0} combo={1} t={t} />);
    expect(screen.queryByText(/×/)).toBeNull();
    rerender(<WordTowerStatHud heightM={10} biomeId="city" floorsCount={1} personalBestM={0} combo={4} t={t} />);
    expect(screen.getByText(/×/)).toBeInTheDocument();
  });
});
