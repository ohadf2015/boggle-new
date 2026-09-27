import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { memo } from 'react';
import type { BlastLevel } from '@/lib/blast/v2/types';

// Mock BlastTile as a memo'd render counter. This lets us assert that BlastBoard
// hands tiles referentially-stable props: when only the SELECTION changes (the
// drag hot path, fired many times/sec), tiles whose own state is unchanged must
// NOT re-render. Unstable per-tile closures or fresh `[]` flags defeat the memo
// and cause every tile to re-render on every pointer move.
const renderCounts: Record<string, number> = {};
function bumpRenderCount(cellId: string): void {
  renderCounts[cellId] = (renderCounts[cellId] ?? 0) + 1;
}
vi.mock('../BlastTile', () => ({
  BlastTile: memo(function MockTile({ cellId }: { cellId: string }) {
    bumpRenderCount(cellId);
    return <div data-cell-id={cellId} />;
  }),
}));

import { BlastBoard } from '../BlastBoard';

const mockLevel: BlastLevel = {
  id: 'rerender-test',
  levelNumber: 1,
  locale: 'en',
  theme: 'onboarding',
  columns: [
    { index: 0, tiles: ['C', 'A', 'T'] },
    { index: 1, tiles: ['S', 'U', 'N'] },
    { index: 2, tiles: ['E', 'G', 'G'] },
  ],
  words: ['CAT', 'SUN', 'EGG'],
  resolvableOrder: ['CAT', 'SUN', 'EGG'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 1,
};

describe('BlastBoard re-render efficiency', () => {
  beforeEach(() => {
    for (const k of Object.keys(renderCounts)) delete renderCounts[k];
  });

  it('does not re-render unaffected tiles when only the selection changes', () => {
    // Stable callbacks reused across renders — the parent (BlastGame) memoizes
    // these; the board must forward them without minting new per-tile closures.
    const props = {
      level: mockLevel,
      invalidShakeKey: 0,
      onPointerDown: vi.fn(),
      onPointerEnter: vi.fn(),
      onPointerUp: vi.fn(),
      tileIds: mockLevel.columns.map((col, c) => col.tiles.map((_, r) => `t-${c}-${r}`)),
      boardRows: 3,
    };

    const { rerender } = render(
      <BlastBoard
        {...props}
        selection={{ kind: 'active', cells: ['c0r0'], axis: 'undecided', mode: 'drag' }}
      />
    );

    const before = renderCounts['c2r0'];
    expect(before).toBeGreaterThan(0);

    // Drag extends the selection to c0r1. Only c0r1's `state` flips
    // (normal -> selected); c2r0 is untouched and must not re-render.
    rerender(
      <BlastBoard
        {...props}
        selection={{ kind: 'active', cells: ['c0r0', 'c0r1'], axis: 'undecided', mode: 'drag' }}
      />
    );

    expect(renderCounts['c2r0']).toBe(before); // unaffected tile: no re-render
    expect(renderCounts['c0r1']).toBeGreaterThan(before); // newly selected: re-rendered
  });
});
