import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WordCraftRack } from '../WordCraftRack';
import type { RackTile } from '@/lib/word-craft/types';

const TILES: RackTile[] = [
  { id: 't1', letter: 'A', value: 1, isBlank: false },
  { id: 't2', letter: 'B', value: 3, isBlank: false },
];

describe('WordCraftRack — mobile drag', () => {
  it('rack tile buttons have touch-action:none so single-finger drag is not stolen by browser scroll', () => {
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
    // touch-manipulation still allows single-finger panning → mobile drag dies.
    // touch-none commits the gesture to JS so pointermove reaches our drag hook.
    expect(a.className).toMatch(/\btouch-none\b/);
    expect(a.className).not.toMatch(/\btouch-manipulation\b/);
  });
});
