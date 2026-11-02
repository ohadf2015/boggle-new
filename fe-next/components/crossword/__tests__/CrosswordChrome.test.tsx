// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CrosswordToolbar } from '../CrosswordToolbar';
import { CrosswordProgressRow } from '../CrosswordProgressRow';
import { ClueBar } from '../ClueBar';
import type { Slot } from '@/lib/crossword/types';

const t = (k: string) => k;

describe('CrosswordToolbar', () => {
  it('renders every action as a labelled button and fires its handler', () => {
    const onCheck = vi.fn();
    render(
      <CrosswordToolbar
        actions={[
          { key: 'check', label: 'Check', icon: <i />, onClick: onCheck },
          { key: 'restart', label: 'Restart', icon: <i />, onClick: vi.fn() },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onCheck).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Restart' })).toBeInTheDocument();
  });

  it('never truncates a label (the verb must stay readable)', () => {
    render(<CrosswordToolbar actions={[{ key: 'a', label: 'Reveal word', icon: <i />, onClick: vi.fn() }]} />);
    expect(screen.getByText('Reveal word').className).not.toMatch(/truncate/);
  });
});

describe('CrosswordProgressRow', () => {
  const base = { wordsSolved: 3, wordsTotal: 10, percent: 30, elapsedMs: 65_000, format: 'mini' as const, t };

  it('shows words, percent bar and m:ss timer', () => {
    render(<CrosswordProgressRow {...base} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30');
    expect(screen.getByText('1:05')).toBeInTheDocument();
    expect(screen.getByLabelText('crossword.wordsLabel')).toHaveTextContent('3/10');
  });

  it('renders the size switch only when a handler is wired, and reports the choice', () => {
    const { rerender } = render(<CrosswordProgressRow {...base} />);
    expect(screen.queryByRole('group')).toBeNull();
    const onFormatChange = vi.fn();
    rerender(<CrosswordProgressRow {...base} onFormatChange={onFormatChange} />);
    expect(screen.getByText('crossword.format.mini').closest('button')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByText('crossword.format.full'));
    expect(onFormatChange).toHaveBeenCalledWith('full');
  });
});

describe('ClueBar', () => {
  const slot = { id: 'a1', number: 7, dir: 'down', clue: 'Rotting process', answer: 'DECAY', cells: [] } as unknown as Slot;

  it('shows number, direction and clue in one bar and wires prev/next/direction', () => {
    const [onPrev, onNext, onToggleDir] = [vi.fn(), vi.fn(), vi.fn()];
    render(<ClueBar slot={slot} rtl={false} onPrev={onPrev} onNext={onNext} onToggleDir={onToggleDir} t={t} />);
    expect(screen.getByText('Rotting process')).toBeInTheDocument();
    const dir = screen.getByRole('button', { name: 'crossword.switchDir' });
    expect(dir).toHaveTextContent('7');
    expect(dir).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(dir);
    fireEvent.click(screen.getByRole('button', { name: 'crossword.prevClue' }));
    fireEvent.click(screen.getByRole('button', { name: 'crossword.nextClue' }));
    expect([onToggleDir, onPrev, onNext].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
  });
});
