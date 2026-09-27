// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ClueScramble } from '../ClueScramble';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('ClueScramble', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders the scramble overlay with skip button and text input', () => {
    render(<ClueScramble answer="cat" onResult={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'crossword.scramble.skip' })).toBeTruthy();
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('renders individual letter tiles for the scrambled word', () => {
    render(<ClueScramble answer="dog" onResult={vi.fn()} />);
    // All 3 chars of "DOG" appear as tile spans (scrambled, so order may differ)
    const tiles = document.querySelectorAll('.font-neo-display.font-bold.text-neo-cyan');
    expect(tiles.length).toBe(3);
    const tileText = Array.from(tiles).map((t) => t.textContent).sort().join('');
    expect(tileText).toBe('DGO');
  });

  it('calls onResult(false) when skip is clicked', () => {
    const onResult = vi.fn();
    render(<ClueScramble answer="cat" onResult={onResult} />);
    fireEvent.click(screen.getByRole('button', { name: 'crossword.scramble.skip' }));
    expect(onResult).toHaveBeenCalledWith(false);
  });

  it('calls onResult(false) when the backdrop is clicked', () => {
    const onResult = vi.fn();
    const { container } = render(<ClueScramble answer="cat" onResult={onResult} />);
    // Outer backdrop div has the click handler; inner card stops propagation
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onResult).toHaveBeenCalledWith(false);
  });

  it('calls onResult(true) after typing the correct answer (case-insensitive)', async () => {
    const onResult = vi.fn();
    render(<ClueScramble answer="cat" onResult={onResult} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'cat' } });
    // 380ms delay before onResult fires on success
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(onResult).toHaveBeenCalledWith(true);
  });

  it('does NOT call onResult for a wrong answer', () => {
    const onResult = vi.fn();
    render(<ClueScramble answer="cat" onResult={onResult} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'dog' } });
    expect(onResult).not.toHaveBeenCalled();
  });

  it('calls onResult(false) when the 10-second countdown expires', async () => {
    const onResult = vi.fn();
    render(<ClueScramble answer="cat" onResult={onResult} />);
    // ponytail: chained setTimeout->setState effect needs one act() per tick
    // to flush the passive-effect reschedule between ticks; a single big
    // advanceTimersByTimeAsync only flushes the effect once, at the end.
    for (let i = 0; i < 11; i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    }
    expect(onResult).toHaveBeenCalledWith(false);
  });
});
