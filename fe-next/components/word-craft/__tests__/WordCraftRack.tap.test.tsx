import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WordCraftRack } from '../WordCraftRack';
import type { RackTile } from '@/lib/word-craft/types';

/**
 * Tap-to-place semantics.
 *
 * Player complaint: "wordcraft should work with also tap not just drag."
 * Root cause was that once an axis was locked (≥1 pending), EVERY rack tap
 * fast-fired along the axis, so the player could never re-select a tile and
 * aim it at a specific cell by tapping — tap-select-then-tap-cell only worked
 * for the very first move. Drag became the only way to control placement.
 *
 * New contract:
 *   - Tap an UNSELECTED tile → select it (always, even when axis is locked).
 *     This restores "tap a letter, then tap the cell I want" at every stage.
 *   - Tap the ALREADY-SELECTED tile while axis is locked → fast-tap auto-place
 *     (the 1-tap convenience stays, but as an explicit opt-in confirm gesture).
 *   - consumeDropFlag still suppresses the click that trails a drag/swipe.
 */

const TILES: RackTile[] = [
  { id: 't1', letter: 'A', value: 1, isBlank: false },
  { id: 't2', letter: 'B', value: 3, isBlank: false },
];

function setup(overrides: Partial<React.ComponentProps<typeof WordCraftRack>> = {}) {
  const onSelect = vi.fn();
  const onFastTap = vi.fn();
  render(
    <WordCraftRack
      tiles={TILES}
      selectedId={null}
      pendingIds={new Set()}
      onSelect={onSelect}
      onFastTap={onFastTap}
      ariaLabel="rack"
      {...overrides}
    />,
  );
  return { onSelect, onFastTap };
}

describe('WordCraftRack — tap-to-place', () => {
  it('tapping an UNSELECTED tile selects it even when an axis is locked (does not fast-tap)', () => {
    const { onSelect, onFastTap } = setup({ axisLocked: true, selectedId: null });
    fireEvent.click(screen.getByRole('button', { name: /A/i }));
    expect(onSelect).toHaveBeenCalledWith('t1');
    expect(onFastTap).not.toHaveBeenCalled();
  });

  it('tapping the ALREADY-SELECTED tile while axis is locked fast-taps (auto-place)', () => {
    const { onSelect, onFastTap } = setup({ axisLocked: true, selectedId: 't1' });
    fireEvent.click(screen.getByRole('button', { name: /A/i }));
    expect(onFastTap).toHaveBeenCalledTimes(1);
    expect(onFastTap.mock.calls[0][0]).toMatchObject({ id: 't1' });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('tapping the selected tile with NO axis locked deselects (never fast-taps)', () => {
    const { onSelect, onFastTap } = setup({ axisLocked: false, selectedId: 't1' });
    fireEvent.click(screen.getByRole('button', { name: /A/i }));
    expect(onSelect).toHaveBeenCalledWith(null);
    expect(onFastTap).not.toHaveBeenCalled();
  });

  it('tapping an unselected tile with no axis selects it', () => {
    const { onSelect, onFastTap } = setup({ axisLocked: false, selectedId: null });
    fireEvent.click(screen.getByRole('button', { name: /B/i }));
    expect(onSelect).toHaveBeenCalledWith('t2');
    expect(onFastTap).not.toHaveBeenCalled();
  });

  it('consumeDropFlag suppresses the trailing tap (no select, no fast-tap)', () => {
    const onSelect = vi.fn();
    const onFastTap = vi.fn();
    render(
      <WordCraftRack
        tiles={TILES}
        selectedId="t1"
        pendingIds={new Set()}
        onSelect={onSelect}
        onFastTap={onFastTap}
        axisLocked
        consumeDropFlag={() => true}
        ariaLabel="rack"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /A/i }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onFastTap).not.toHaveBeenCalled();
  });
});
