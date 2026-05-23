import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { WordTowerHud, type WordTowerHudProps } from './WordTowerHud';

// jsdom lacks ResizeObserver (the deck-height effect needs it).
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); cleanup(); vi.unstubAllGlobals(); });

const baseProps = (over: Partial<WordTowerHudProps> = {}): WordTowerHudProps => ({
  anchorLetter: 'A',
  tray: ['B', 'C', 'D'],
  selected: [],
  word: '',
  heightM: 12,
  personalBestM: 0,
  combo: 1,
  scramblesLeft: 3,
  floorsCount: 4,
  possibleWords: null,
  clueWord: null,
  biomeId: 'city',
  lastError: null,
  errorKey: 0,
  lastResult: null,
  resultKey: 0,
  onSelectTile: () => {},
  onBackspace: () => {},
  onClear: () => {},
  onSubmit: () => {},
  onScramble: () => {},
  t: (k: string) => k,
  dir: 'ltr',
  ...over,
});

describe('WordTowerHud reward popup', () => {
  it('stays hidden before any word is built (resultKey 0)', () => {
    render(<WordTowerHud {...baseProps()} />);
    expect(screen.queryByText(/\+.*m/)).toBeNull();
  });

  it('shows the reward on an accepted word, then auto-hides (no longer "always visible")', () => {
    const props = baseProps({ resultKey: 1, lastResult: { tier: 'tall', meters: 5, accepted: true } as never });
    render(<WordTowerHud {...props} />);
    act(() => { vi.advanceTimersByTime(10); });
    expect(screen.getByText(/\+5\.0\s*m/)).toBeTruthy();
    // It must NOT linger forever — the bug was it stayed on screen between words.
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByText(/\+5\.0\s*m/)).toBeNull();
  });

  it('reappears when the next word is built (fresh resultKey re-reveals)', () => {
    const { rerender } = render(
      <WordTowerHud {...baseProps({ resultKey: 1, lastResult: { tier: 'none', meters: 3, accepted: true } as never })} />,
    );
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByText(/\+3\.0\s*m/)).toBeNull();
    rerender(<WordTowerHud {...baseProps({ resultKey: 2, lastResult: { tier: 'none', meters: 7, accepted: true } as never })} />);
    act(() => { vi.advanceTimersByTime(10); });
    expect(screen.getByText(/\+7\.0\s*m/)).toBeTruthy();
  });
});
