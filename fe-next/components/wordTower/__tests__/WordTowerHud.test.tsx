import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordTowerHud, type WordTowerHudProps } from '../WordTowerHud';

// Rewarded ad (clue gate) — mocked; the real hook needs AdMobProvider (global
// in prod via essential-providers, absent in unit tests).
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({ showAd: vi.fn(), isAdAvailable: false, status: 'idle' as const, rewardAmount: 0, preload: vi.fn() }),
}));

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

describe('WordTowerHud — golden-letter mutator highlight', () => {
  it('labels matching tray tiles as golden when the goldenLetter mutator is active', () => {
    render(<WordTowerHud {...makeProps({ goldenLetter: 'T' })} />);
    // every 'T' tile carries the golden a11y label; non-T tiles stay plain.
    expect(screen.getAllByLabelText('wordTower.a11y.goldenTile:T').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('wordTower.a11y.tile:A').length).toBeGreaterThan(0);
  });

  it('uses the plain tile label for all tiles when no golden letter is set', () => {
    render(<WordTowerHud {...makeProps()} />);
    expect(screen.queryByLabelText(/goldenTile/)).toBeNull();
  });
});

describe('WordTowerHud', () => {
  it('reveals the Build control (wheel centre) only once the word is 3+ letters', () => {
    // The redundant bottom Build button is gone; building lives in the wheel
    // centre, which only surfaces the control once a buildable word is spelled.
    const { rerender } = render(<WordTowerHud {...makeProps({ word: 'CA' })} />);
    expect(screen.queryByRole('button', { name: /wordTower\.hud\.build/ })).toBeNull();
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
    render(<WordTowerHud {...makeProps({ lastError: 'not_buildable', errorKey: 1 })} />);
    expect(screen.getByText('wordTower.error.not_buildable')).toBeInTheDocument();
  });

  it('reports its control-deck height so the tower can ground above it', () => {
    const onDeckHeight = vi.fn();
    render(<WordTowerHud {...makeProps({ onDeckHeight })} />);
    expect(onDeckHeight).toHaveBeenCalled();
  });

  it('swaps the wheel-centre Build → Drop control when a word is pending placement', () => {
    const onSubmit = vi.fn();
    const onCraneDrop = vi.fn();
    const { rerender } = render(
      <WordTowerHud {...makeProps({ word: 'CAT', onSubmit, onCraneDrop })} />,
    );
    // Spelling a word: the wheel centre is the Build control, no Drop yet.
    expect(screen.queryByRole('button', { name: /wordTower\.crane\.steer/ })).toBeNull();
    expect(screen.getByRole('button', { name: /wordTower\.hud\.build/ })).toBeEnabled();

    rerender(
      <WordTowerHud {...makeProps({ word: 'CAT', pendingWord: 'CCAT', onSubmit, onCraneDrop })} />,
    );
    // Word in flight: the same centre morphs into the Drop control.
    expect(screen.queryByRole('button', { name: /wordTower\.hud\.build/ })).toBeNull();
    const dropBtn = screen.getByRole('button', { name: /wordTower\.crane\.steer/ });
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
