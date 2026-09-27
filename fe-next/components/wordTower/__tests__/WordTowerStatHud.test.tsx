import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordTowerStatHud } from '../WordTowerStatHud';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

describe('WordTowerStatHud', () => {
  it('shows the rounded altitude as the hero readout', () => {
    render(<WordTowerStatHud heightM={42.7} combo={1} t={t} />);
    expect(screen.getByText('43')).toBeInTheDocument();
    // The simplified HUD has no expand toggle, biome, floors, or best details.
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(/wordTower\.biome\./)).toBeNull();
  });

  it('surfaces the combo streak chip only when the chain is above 1', () => {
    const { rerender } = render(<WordTowerStatHud heightM={10} combo={1} t={t} />);
    expect(screen.queryByText(/×/)).toBeNull();
    rerender(<WordTowerStatHud heightM={10} combo={4} t={t} />);
    expect(screen.getByText(/×/)).toBeInTheDocument();
  });
});
