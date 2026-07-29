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

  it('scrolls freely between letters — proximity snap, not mandatory', () => {
    // snap-mandatory forced the rail to always lock onto a tile, fighting the
    // finger ("hard to scroll between letters"). snap-proximity lets the rail
    // pan freely and only gently settles near a tile.
    render(
      <WordCraftRack
        tiles={TILES}
        selectedId={null}
        pendingIds={new Set()}
        onSelect={vi.fn()}
        ariaLabel="rack"
      />,
    );
    const rail = screen.getByRole('toolbar', { name: 'rack' });
    expect(rail.className).toMatch(/\bsnap-proximity\b/);
    expect(rail.className).not.toMatch(/\bsnap-mandatory\b/);
    expect(rail.className).toMatch(/\boverscroll-x-contain\b/);
  });
});
