import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordTowerHud, type WordTowerHudProps } from '../WordTowerHud';

// Rewarded ad (clue gate) — mocked; the real hook needs AdMobProvider (global
// in prod via essential-providers, absent in unit tests). `showAd` calls the
// reward callback synchronously so tests can simulate a completed ad watch.
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: (opts: { onRewardEarned: () => void }) => ({
    showAd: vi.fn(() => opts.onRewardEarned()),
    isAdAvailable: false,
    status: 'idle' as const,
    rewardAmount: 0,
    preload: vi.fn(),
  }),
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
    lastError: null,
    errorKey: 0,
    lastResult: null,
    resultKey: 0,
    onSelectTile: vi.fn(),
    onBackspace: vi.fn(),
    onClear: vi.fn(),
    onSubmit: vi.fn(),
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
    expect(screen.queryByRole('button', { name: /wordTower\.crane\.drop/ })).toBeNull();
    expect(screen.getByRole('button', { name: /wordTower\.hud\.build/ })).toBeEnabled();

    rerender(
      <WordTowerHud {...makeProps({ word: 'CAT', pendingWord: 'CCAT', onSubmit, onCraneDrop })} />,
    );
    // Word in flight: the same centre morphs into the Drop control.
    expect(screen.queryByRole('button', { name: /wordTower\.hud\.build/ })).toBeNull();
    const dropBtn = screen.getByRole('button', { name: /wordTower\.crane\.drop/ });
    fireEvent.click(dropBtn);
    expect(onCraneDrop).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('locks the tray while placing but offers an enabled KEEP BUILDING escape', () => {
    const onCancelPlacement = vi.fn();
    render(
      <WordTowerHud {...makeProps({ word: 'CAT', selected: [0, 1, 2], pendingWord: 'CCAT', possibleWords: 0, onCancelPlacement })} />,
    );
    // Tray letters stay locked so the armed word can't change under the crane
    // (the scramble/clue tools live in the top bar now and lock via `disabled`
    // there — see WordTowerToolbar.test.tsx)...
    // ...but the backspace slot flips to an ENABLED "keep building" button that
    // bails back to the builder (the continue-building escape hatch), so there is
    // no disabled backspace button here any more.
    expect(screen.queryByRole('button', { name: /wordTower\.hud\.backspace/ })).toBeNull();
    const keep = screen.getByRole('button', { name: /wordTower\.hud\.keepBuilding/ });
    expect(keep).toBeEnabled();
    fireEvent.click(keep);
    expect(onCancelPlacement).toHaveBeenCalledTimes(1);
  });
});
