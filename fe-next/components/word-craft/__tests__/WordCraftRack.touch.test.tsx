import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WordCraftRack } from '../WordCraftRack';
import type { RackTile } from '@/lib/word-craft/types';

const TILES: RackTile[] = [
  { id: 't1', letter: 'A', value: 1, isBlank: false },
  { id: 't2', letter: 'B', value: 3, isBlank: false },
];

describe('WordCraftRack — mobile drag', () => {
  it('rack tile buttons use touch-pan-x so horizontal swipe scrolls the rack while vertical drag still wins', () => {
    render(
      <WordCraftRack
        tiles={TILES}
        selectedId={null}
        pendingIds={new Set()}
        onSelect={vi.fn()}
        ariaLabel="rack"
      />,
    );
    const a = screen.getByRole('button', { name: /A/i });
    // Was touch-none — drag-always-wins meant the rack could never be
    // horizontally scrolled on phones where 7 tiles overflow the viewport
    // (player complaint 2026-05-13: "can't swipe to see more letters").
    // touch-pan-x: browser handles horizontal pan; useWordCraftDrag
    // direction-gates touch activation on vertical-dominant motion so
    // dragging a tile up onto the board still beats the scroller.
    expect(a.className).toMatch(/\btouch-pan-x\b/);
    expect(a.className).not.toMatch(/\btouch-none\b/);
    expect(a.className).not.toMatch(/\btouch-manipulation\b/);
  });
});
