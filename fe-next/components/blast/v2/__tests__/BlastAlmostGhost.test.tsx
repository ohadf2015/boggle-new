import { describe, it, expect } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { createRef } from 'react';
import { BlastAlmostGhost } from '../BlastAlmostGhost';
import type { AlmostWord } from '@/lib/blast/v2/engine';

describe('BlastAlmostGhost', () => {
  it('renders one ghost per almost-word with neededLetter visible', () => {
    cleanup();
    const almosts: AlmostWord[] = [
      { word: 'DOG', filledCells: [], gapCell: { col: 0, row: 0 }, neededLetter: 'D' },
      { word: 'CAT', filledCells: [], gapCell: { col: 1, row: 0 }, neededLetter: 'C' },
    ];
    const { container } = render(<BlastAlmostGhost almosts={almosts} />);
    const ghosts = container.querySelectorAll('[data-almost-ghost]');
    expect(ghosts).toHaveLength(2);
    expect(ghosts[0]!.textContent).toBe('D');
    expect(ghosts[1]!.textContent).toBe('C');
  });

  it('tags each ghost with its target word + column for FX/styling', () => {
    cleanup();
    const almosts: AlmostWord[] = [
      { word: 'DOG', filledCells: [], gapCell: { col: 2, row: 1 }, neededLetter: 'D' },
    ];
    const { container } = render(<BlastAlmostGhost almosts={almosts} />);
    const ghost = container.querySelector('[data-almost-ghost]') as HTMLElement;
    expect(ghost.getAttribute('data-almost-ghost')).toBe('DOG');
    expect(ghost.getAttribute('data-target-col')).toBe('2');
    expect(ghost.getAttribute('data-target-row')).toBe('1');
  });

  it('renders nothing when almosts is empty', () => {
    cleanup();
    const { container } = render(<BlastAlmostGhost almosts={[]} />);
    expect(container.querySelectorAll('[data-almost-ghost]')).toHaveLength(0);
  });

  it('hidden flag suppresses render (during active selection / cascade animation)', () => {
    cleanup();
    const almosts: AlmostWord[] = [
      { word: 'DOG', filledCells: [], gapCell: { col: 0, row: 0 }, neededLetter: 'D' },
    ];
    const { container } = render(<BlastAlmostGhost almosts={almosts} hidden />);
    expect(container.querySelectorAll('[data-almost-ghost]')).toHaveLength(0);
  });

  it('falls back to CSS-variable positioning when boardRef is missing', () => {
    cleanup();
    const almosts: AlmostWord[] = [
      { word: 'DOG', filledCells: [], gapCell: { col: 1, row: 2 }, neededLetter: 'D' },
    ];
    const { container } = render(<BlastAlmostGhost almosts={almosts} />);
    const ghost = container.querySelector('[data-almost-ghost]') as HTMLElement;
    expect(ghost.style.getPropertyValue('--ghost-col')).toBe('1');
    expect(ghost.style.getPropertyValue('--ghost-row')).toBe('2');
  });

  it('falls back when boardRef has null current (component not mounted)', () => {
    cleanup();
    const almosts: AlmostWord[] = [
      { word: 'CAT', filledCells: [], gapCell: { col: 0, row: 0 }, neededLetter: 'C' },
    ];
    const ref = createRef<HTMLElement>();
    const { container } = render(<BlastAlmostGhost almosts={almosts} boardRef={ref} />);
    const ghost = container.querySelector('[data-almost-ghost]') as HTMLElement;
    // Ref never assigned to a real element → fallback path, CSS vars set.
    expect(ghost.style.getPropertyValue('--ghost-col')).toBe('0');
  });
});
