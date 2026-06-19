import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { WordTowerHud, type WordTowerHudProps } from './WordTowerHud';

// jsdom lacks ResizeObserver (the deck-height effect needs it).
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const baseProps = (over: Partial<WordTowerHudProps> = {}): WordTowerHudProps => ({
  anchorLetter: '',
  tray: ['C', 'A', 'T', 'S'],
  selected: [],
  word: '',
  heightM: 12,
  combo: 1,
  scramblesLeft: 3,
  possibleWords: null,
  clueWord: null,
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

describe('WordTowerHud deck', () => {
  it('renders the tray tools (scramble + backspace)', () => {
    render(<WordTowerHud {...baseProps()} />);
    expect(screen.getByLabelText('wordTower.hud.scramble')).toBeTruthy();
    expect(screen.getByLabelText('wordTower.hud.backspace')).toBeTruthy();
  });

  it('keeps the BUILD action OUT of the bottom deck while no word is spelled', () => {
    // The redundant bottom BUILD button was removed — building now lives in the
    // wheel centre, which only surfaces a build control once a word is ready.
    render(<WordTowerHud {...baseProps({ word: '', selected: [] })} />);
    expect(screen.queryByLabelText('wordTower.hud.build')).toBeNull();
  });

  it('surfaces the BUILD control (in the wheel centre) once a 3+ letter word is spelled', () => {
    const onSubmit = vi.fn();
    render(<WordTowerHud {...baseProps({ word: 'CAT', selected: [0, 1, 2], onSubmit })} />);
    const build = screen.getByLabelText('wordTower.hud.build');
    expect(build).toBeTruthy();
    fireEvent.click(build);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows the error line on a rejected word', () => {
    render(<WordTowerHud {...baseProps({ lastError: 'not_in_dictionary', errorKey: 1 })} />);
    expect(screen.getByText('wordTower.error.not_in_dictionary')).toBeTruthy();
  });
});
