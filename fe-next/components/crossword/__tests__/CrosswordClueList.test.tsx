// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CrosswordClueList } from '../CrosswordClueList';
import { buildSeedPuzzle } from '@/lib/crossword/puzzles/index';
import type { SeedPuzzle } from '@/lib/crossword/puzzles/seed';

const t = (key: string) => key;

// A real crossword (blocks + across≠down), so Across and Down lists differ.
const seed: SeedPuzzle = {
  id: 'cl-en',
  locale: 'en',
  difficulty: 'easy',
  rtl: false,
  grid: [
    [null, 'c', 'a', 't'],
    ['a', 'r', 'e', 'a'],
    ['t', 'o', 'n', 'e'],
    ['m', 'w', 'd', null],
  ],
  // clue text keyed by slot id; values just need to be identifiable in the test
  clues: {},
};

function build() {
  const puzzle = buildSeedPuzzle(seed);
  // give every slot a recognizable clue so the "non-empty" expectation is meaningful
  const slots = puzzle.slots.map((s) => ({ ...s, clue: `clue-${s.id}` }));
  return { puzzle, slots };
}

describe('CrosswordClueList', () => {
  it('renders Across and Down sections with every slot listed once', () => {
    const { slots } = build();
    render(
      <CrosswordClueList slots={slots} activeSlotId={null} onSelect={() => {}} t={t} />,
    );

    expect(screen.getByText('crossword.acrossHeading')).toBeTruthy();
    expect(screen.getByText('crossword.downHeading')).toBeTruthy();

    // one button per slot
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(slots.length);
    // every clue text shows
    for (const s of slots) {
      expect(screen.getByText(`clue-${s.id}`)).toBeTruthy();
    }
  });

  it('marks the active slot with aria-current', () => {
    const { slots } = build();
    const active = slots.find((s) => s.dir === 'down')!;
    render(
      <CrosswordClueList slots={slots} activeSlotId={active.id} onSelect={() => {}} t={t} />,
    );
    const current = screen.getByText(`clue-${active.id}`).closest('button')!;
    expect(current.getAttribute('aria-current')).toBe('true');
    // exactly one current
    const all = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-current') === 'true');
    expect(all.length).toBe(1);
  });

  it('calls onSelect with the clicked slot', () => {
    const { slots } = build();
    const onSelect = vi.fn();
    render(
      <CrosswordClueList slots={slots} activeSlotId={null} onSelect={onSelect} t={t} />,
    );
    const target = slots[2];
    fireEvent.click(screen.getByText(`clue-${target.id}`).closest('button')!);
    expect(onSelect).toHaveBeenCalledWith(target);
  });

  it('lists clues within a section in ascending grid-number order', () => {
    const { slots } = build();
    const { container } = render(
      <CrosswordClueList slots={slots} activeSlotId={null} onSelect={() => {}} t={t} />,
    );
    const acrossSection = container.querySelector('[data-dir="across"]')!;
    const numbers = within(acrossSection as HTMLElement)
      .getAllByRole('button')
      .map((b) => Number(b.getAttribute('data-slot-number')));
    const sorted = [...numbers].sort((a, b) => a - b);
    expect(numbers).toEqual(sorted);
  });
});
