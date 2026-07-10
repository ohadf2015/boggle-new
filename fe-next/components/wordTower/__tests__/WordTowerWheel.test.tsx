import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { WordTowerWheel, type WordTowerWheelProps } from '../WordTowerWheel';

const t = (key: string) => key;

function makeProps(over: Partial<WordTowerWheelProps> = {}): WordTowerWheelProps {
  return {
    tray: ['C', 'A', 'T', 'S', 'X', 'Y', 'Z'],
    selected: [],
    word: '',
    placing: false,
    canBuild: false,
    intensity: 0,
    accentHex: '#fff',
    dir: 'ltr',
    t,
    onSelectTile: vi.fn(),
    onDeselectTile: vi.fn(),
    onSubmit: vi.fn(),
    onDrop: vi.fn(),
    ...over,
  };
}

describe('WordTowerWheel — auto-build after idle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('auto-fires onSubmit 1s after the word becomes buildable with no further taps', () => {
    const onSubmit = vi.fn();
    render(<WordTowerWheel {...makeProps({ selected: [0, 1, 2], word: 'CAT', canBuild: true, onSubmit })} />);
    vi.advanceTimersByTime(999);
    expect(onSubmit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('resets the idle timer when another letter is selected', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <WordTowerWheel {...makeProps({ selected: [0, 1, 2], word: 'CAT', canBuild: true, onSubmit })} />,
    );
    vi.advanceTimersByTime(900);
    // Player picks another letter before the 1s auto-build fires.
    rerender(<WordTowerWheel {...makeProps({ selected: [0, 1, 2, 3], word: 'CATS', canBuild: true, onSubmit })} />);
    vi.advanceTimersByTime(900);
    expect(onSubmit).not.toHaveBeenCalled(); // only 900ms since the reset
    vi.advanceTimersByTime(100);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not auto-build while the word is not yet buildable', () => {
    const onSubmit = vi.fn();
    render(<WordTowerWheel {...makeProps({ selected: [0, 1], word: 'CA', canBuild: false, onSubmit })} />);
    vi.advanceTimersByTime(5000);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not auto-build once a word is already placed (placing)', () => {
    const onSubmit = vi.fn();
    render(
      <WordTowerWheel {...makeProps({ selected: [0, 1, 2], word: 'CAT', canBuild: true, placing: true, onSubmit })} />,
    );
    vi.advanceTimersByTime(5000);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('a manual tap on the BUILD hub still submits immediately without waiting', () => {
    const onSubmit = vi.fn();
    render(<WordTowerWheel {...makeProps({ selected: [0, 1, 2], word: 'CAT', canBuild: true, onSubmit })} />);
    fireEvent.click(screen.getByRole('button', { name: /wordTower\.hud\.build/ }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
