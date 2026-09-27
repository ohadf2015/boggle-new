import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

// Rewarded ad: reward instantly so a press reaches the reveal path (the real
// hook needs AdMobProvider, which unit tests don't mount).
const showAd = vi.fn();
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: (opts: { onRewardEarned: () => void }) => ({
    showAd: () => { showAd(); opts.onRewardEarned(); },
    isAdAvailable: true,
    status: 'idle' as const,
    rewardAmount: 0,
    preload: vi.fn(),
  }),
}));

import { WordTowerToolbar, type WordTowerToolbarProps } from '../WordTowerToolbar';

const CLUES = ['CARE', 'CART', 'CATER'];

const baseProps = (over: Partial<WordTowerToolbarProps> = {}): WordTowerToolbarProps => ({
  possibleWords: 5,
  getClue: (skip: number) => CLUES[skip % CLUES.length],
  scramblesLeft: 2,
  scrambleCost: 25,
  coinBalance: 100,
  onScramble: vi.fn(),
  onReroll: vi.fn(),
  disabled: false,
  t: (k: string) => k,
  dir: 'ltr',
  ...over,
});

afterEach(cleanup);
beforeEach(() => showAd.mockClear());

const pressClue = () => fireEvent.click(screen.getByTestId('wt-clue-button'));

describe('WordTowerToolbar — clue rotation', () => {
  it('reveals a clue on the first press', () => {
    render(<WordTowerToolbar {...baseProps()} />);
    expect(screen.queryByTestId('wt-clue-word')).toBeNull();
    pressClue();
    expect(screen.getByTestId('wt-clue-word').textContent).toBe('CARE');
  });

  it('advances to a DIFFERENT word on each further press (the stuck-clue bug)', () => {
    render(<WordTowerToolbar {...baseProps()} />);
    pressClue();
    expect(screen.getByTestId('wt-clue-word').textContent).toBe('CARE');
    pressClue();
    expect(screen.getByTestId('wt-clue-word').textContent).toBe('CART');
    pressClue();
    expect(screen.getByTestId('wt-clue-word').textContent).toBe('CATER');
  });

  it('keeps the clue button pressable while clues remain', () => {
    render(<WordTowerToolbar {...baseProps()} />);
    pressClue();
    expect(screen.getByTestId('wt-clue-button')).not.toBeDisabled();
  });

  it('charges a rewarded ad per clue', () => {
    render(<WordTowerToolbar {...baseProps()} />);
    pressClue();
    pressClue();
    expect(showAd).toHaveBeenCalledTimes(2);
  });

  it('disables the clue once the per-run cap is spent', () => {
    render(<WordTowerToolbar {...baseProps()} />);
    for (let i = 0; i < 12; i++) {
      const btn = screen.getByTestId('wt-clue-button') as HTMLButtonElement;
      if (btn.disabled) break;
      fireEvent.click(btn);
    }
    expect(screen.getByTestId('wt-clue-button')).toBeDisabled();
  });

  it('spends ONE run-wide cap across different wheels (moved from the HUD suite)', () => {
    const { rerender } = render(<WordTowerToolbar {...baseProps({ wheelKey: 'A' })} />);
    pressClue();
    rerender(<WordTowerToolbar {...baseProps({ wheelKey: 'B' })} />);
    pressClue();
    rerender(<WordTowerToolbar {...baseProps({ wheelKey: 'C' })} />);
    pressClue(); // hits CLUE_RUN_CAP
    rerender(<WordTowerToolbar {...baseProps({ wheelKey: 'D' })} />);
    expect(screen.getByTestId('wt-clue-button')).toBeDisabled();
    expect(screen.queryByTestId('wt-clue-word')).toBeNull();
  });

  it('drops the stale clue when the wheel changes', () => {
    const { rerender } = render(<WordTowerToolbar {...baseProps({ wheelKey: 'CATS' })} />);
    pressClue();
    expect(screen.getByTestId('wt-clue-word')).toBeTruthy();
    rerender(<WordTowerToolbar {...baseProps({ wheelKey: 'DOGS' })} />);
    expect(screen.queryByTestId('wt-clue-word')).toBeNull();
  });
});

describe('WordTowerToolbar — stuck escapes', () => {
  it('swaps the clue for a free reroll when no word is buildable', () => {
    render(<WordTowerToolbar {...baseProps({ possibleWords: 0 })} />);
    expect(screen.queryByTestId('wt-clue-button')).toBeNull();
    expect(screen.getByTestId('wt-reroll-button')).toBeTruthy();
  });

  it('offers scramble only while stuck, and disables it with no bonus and no coins', () => {
    const { rerender } = render(<WordTowerToolbar {...baseProps()} />);
    expect(screen.queryByTestId('wt-scramble-button')).toBeNull();
    rerender(<WordTowerToolbar {...baseProps({ possibleWords: 0 })} />);
    expect(screen.getByTestId('wt-scramble-button')).not.toBeDisabled();
    rerender(<WordTowerToolbar {...baseProps({ possibleWords: 0, scramblesLeft: 0, coinBalance: 0 })} />);
    expect(screen.getByTestId('wt-scramble-button')).toBeDisabled();
  });

  it('locks every tool while a word is in flight on the crane', () => {
    render(<WordTowerToolbar {...baseProps({ possibleWords: 0, disabled: true })} />);
    expect(screen.getByTestId('wt-scramble-button')).toBeDisabled();
    expect(screen.getByTestId('wt-reroll-button')).toBeDisabled();
  });
});
