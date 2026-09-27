import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WordCraftRack } from '../WordCraftRack';

describe('WordCraftRack golden tiles', () => {
  it('marks golden tiles with data-golden', () => {
    const tiles = [
      { id: 't-1', letter: 'A', value: 1, isBlank: false },
      { id: 't-2', letter: 'B', value: 3, isBlank: false },
    ];
    const { container } = render(
      <WordCraftRack
        tiles={tiles}
        selectedId={null}
        pendingIds={new Set()}
        onSelect={vi.fn()}
        ariaLabel="rack"
        isGolden={(id) => id === 't-2'}
      />,
    );
    expect(container.querySelector('[data-rack-tile-id="t-2"][data-golden]')).toBeTruthy();
    expect(container.querySelector('[data-rack-tile-id="t-1"][data-golden]')).toBeNull();
  });

  it('renders no golden marks without the prop', () => {
    const tiles = [{ id: 't-1', letter: 'A', value: 1, isBlank: false }];
    const { container } = render(
      <WordCraftRack tiles={tiles} selectedId={null} pendingIds={new Set()} onSelect={vi.fn()} ariaLabel="rack" />,
    );
    expect(container.querySelector('[data-golden]')).toBeNull();
  });
});
