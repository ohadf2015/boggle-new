import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordTowerHud, type WordTowerHudProps } from '../WordTowerHud';

// t echoes key + params so labels are distinguishable in queries.
const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

function makeProps(over: Partial<WordTowerHudProps> = {}): WordTowerHudProps {
  return {
    anchorLetter: 'C',
    tray: ['A', 'T', 'R', 'E', 'A', 'E', 'N', 'T', 'I', 'S', 'L', 'T'],
    selected: [],
    word: 'C',
    heightM: 12,
    combo: 0,
    scramblesLeft: 3,
    floorsCount: 4,
    biomeId: 'city',
    lastError: null,
    errorKey: 0,
    lastResult: null,
    resultKey: 0,
    onSelectTile: vi.fn(),
    onBackspace: vi.fn(),
    onClear: vi.fn(),
    onSubmit: vi.fn(),
    onScramble: vi.fn(),
    t,
    dir: 'ltr',
    ...over,
  };
}

describe('WordTowerHud', () => {
  it('disables Build until the word is 3+ letters', () => {
    const { rerender } = render(<WordTowerHud {...makeProps({ word: 'CA' })} />);
    expect(screen.getByRole('button', { name: /wordTower\.hud\.build/ })).toBeDisabled();
    rerender(<WordTowerHud {...makeProps({ word: 'CAT' })} />);
    expect(screen.getByRole('button', { name: /wordTower\.hud\.build/ })).toBeEnabled();
  });

  it('disables Scramble when no scrambles remain', () => {
    const { rerender } = render(<WordTowerHud {...makeProps({ scramblesLeft: 0 })} />);
    expect(screen.getByRole('button', { name: /wordTower\.hud\.scramble/ })).toBeDisabled();
    rerender(<WordTowerHud {...makeProps({ scramblesLeft: 2 })} />);
    expect(screen.getByRole('button', { name: /wordTower\.hud\.scramble/ })).toBeEnabled();
  });

  it('fires onSelectTile when a tray tile is tapped', () => {
    const onSelectTile = vi.fn();
    render(<WordTowerHud {...makeProps({ onSelectTile })} />);
    // Tray index 2 is 'R' (unique letter → unambiguous aria-label).
    fireEvent.click(screen.getByRole('button', { name: 'wordTower.a11y.tile:R' }));
    expect(onSelectTile).toHaveBeenCalledWith(2);
  });

  it('shows the error message after a rejection', () => {
    render(<WordTowerHud {...makeProps({ lastError: 'bad_chain', errorKey: 1 })} />);
    expect(screen.getByText('wordTower.error.bad_chain')).toBeInTheDocument();
  });

  it('shows the floating reward popup on an accepted word', () => {
    render(
      <WordTowerHud
        {...makeProps({
          resultKey: 1,
          lastResult: { floorAdded: true, meters: 4.2, combo: 2, scramblesEarned: 0, bombCharge: 1, tier: 'highRise', heightM: 16, biome: 'city' },
        })}
      />,
    );
    expect(screen.getByText('+4.2 m')).toBeInTheDocument();
    expect(screen.getByText('wordTower.celebration.highRise')).toBeInTheDocument();
  });

  it('surfaces the combo multiplier in the reward popup only when combo > 1', () => {
    const result = { floorAdded: true, meters: 4.2, combo: 2, scramblesEarned: 0, bombCharge: 1, tier: 'highRise', heightM: 16, biome: 'city' } as const;
    // combo === 1 → no multiplier shown
    const { rerender } = render(<WordTowerHud {...makeProps({ resultKey: 1, combo: 1, lastResult: result })} />);
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
    // combo > 1 → multiplier rides along with the "+Xm" reward
    rerender(<WordTowerHud {...makeProps({ resultKey: 1, combo: 5, lastResult: result })} />);
    expect(screen.getByText(/×/)).toBeInTheDocument();
  });

  it('reports its control-deck height so the tower can ground above it', () => {
    const onDeckHeight = vi.fn();
    render(<WordTowerHud {...makeProps({ onDeckHeight })} />);
    expect(onDeckHeight).toHaveBeenCalled();
  });

  it('swaps Build → Drop CTA at the SAME position when a word is pending placement', () => {
    const onSubmit = vi.fn();
    const onCraneDrop = vi.fn();
    const { rerender } = render(
      <WordTowerHud {...makeProps({ word: 'CAT', onSubmit, onCraneDrop })} />,
    );
    expect(screen.queryByRole('button', { name: /wordTower\.crane\.tapToDrop/ })).toBeNull();
    expect(screen.getByRole('button', { name: /wordTower\.hud\.build/ })).toBeEnabled();

    rerender(
      <WordTowerHud {...makeProps({ word: 'CAT', pendingWord: 'CCAT', onSubmit, onCraneDrop })} />,
    );
    expect(screen.queryByRole('button', { name: /wordTower\.hud\.build/ })).toBeNull();
    const dropBtn = screen.getByRole('button', { name: /wordTower\.crane\.tapToDrop/ });
    fireEvent.click(dropBtn);
    expect(onCraneDrop).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('locks the tray + edit buttons while a word is pending placement', () => {
    render(
      <WordTowerHud {...makeProps({ word: 'CAT', selected: [0, 1, 2], pendingWord: 'CCAT' })} />,
    );
    expect(screen.getByRole('button', { name: 'wordTower.a11y.tile:R' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /wordTower\.hud\.backspace/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /wordTower\.hud\.scramble/ })).toBeDisabled();
  });
});
