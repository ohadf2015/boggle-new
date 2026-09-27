// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClueBar } from '../ClueBar';
import type { Slot } from '@/lib/crossword/types';

const t = (key: string) => key;

const slot: Slot = {
  id: 'A1',
  dir: 'across',
  number: 1,
  row: 0,
  col: 0,
  length: 3,
  cells: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
  ],
  answer: 'cat',
  clue: 'Feline pet',
};

describe('ClueBar direction toggle (discoverable horizontal↔vertical switch)', () => {
  it('renders an explicit, labelled direction-toggle control showing the current direction', () => {
    render(<ClueBar slot={slot} rtl={false} onPrev={vi.fn()} onNext={vi.fn()} onToggleDir={vi.fn()} t={t} />);
    const toggle = screen.getByRole('button', { name: 'crossword.switchDir' });
    expect(toggle).toBeTruthy();
    expect(toggle.textContent).toContain('crossword.dir.across');
  });

  it('fires onToggleDir when the direction control is clicked', () => {
    const onToggleDir = vi.fn();
    render(<ClueBar slot={slot} rtl={false} onPrev={vi.fn()} onNext={vi.fn()} onToggleDir={onToggleDir} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'crossword.switchDir' }));
    expect(onToggleDir).toHaveBeenCalledTimes(1);
  });

  it('reflects the down direction when the active slot is a down word', () => {
    render(
      <ClueBar slot={{ ...slot, id: 'D1', dir: 'down' }} rtl={false} onPrev={vi.fn()} onNext={vi.fn()} onToggleDir={vi.fn()} t={t} />,
    );
    const toggle = screen.getByRole('button', { name: 'crossword.switchDir' });
    expect(toggle.textContent).toContain('crossword.dir.down');
  });

  it('does NOT fire onToggleDir when tapping the clue text area (read-only, not a toggle)', () => {
    // The clue text is for reading — tapping it to read should never change direction.
    // Only the explicit AxisIcon button should toggle.
    const onToggleDir = vi.fn();
    render(<ClueBar slot={slot} rtl={false} onPrev={vi.fn()} onNext={vi.fn()} onToggleDir={onToggleDir} t={t} />);
    // The clue text must NOT be a button role — it's a passive display area.
    expect(screen.queryByRole('button', { name: 'Feline pet' })).toBeNull();
    expect(onToggleDir).not.toHaveBeenCalled();
  });
});
