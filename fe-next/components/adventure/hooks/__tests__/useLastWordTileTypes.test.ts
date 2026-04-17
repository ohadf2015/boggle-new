/**
 * useLastWordTileTypes Tests
 *
 * Captures the activated tile-types from the most recently submitted word.
 * Only updates on the rising edge of wordsFound.length (a new word landed),
 * never on tile state changes alone.
 */

import { renderHook, act } from '@testing-library/react';
import { useLastWordTileTypes } from '../useLastWordTileTypes';

interface Tile { type: string; activationEffect?: unknown; }
type Props = Parameters<typeof useLastWordTileTypes>[0];

describe('useLastWordTileTypes', () => {
  it('starts empty', () => {
    const tiles: Tile[] = [{ type: 'fire', activationEffect: 'burn' }];
    const { result } = renderHook(() => useLastWordTileTypes({ wordsFoundLength: 0, tiles }));
    expect(result.current.lastWordTileTypes).toEqual([]);
  });

  it('captures activated tile types when a new word lands', () => {
    const tiles: Tile[] = [
      { type: 'fire', activationEffect: 'burn' },
      { type: 'plain' },
      { type: 'ice', activationEffect: 'freeze' },
    ];
    const { result, rerender } = renderHook(
      (p: Props) => useLastWordTileTypes(p),
      { initialProps: { wordsFoundLength: 0, tiles } as Props },
    );
    rerender({ wordsFoundLength: 1, tiles });
    expect(result.current.lastWordTileTypes).toEqual(['fire', 'ice']);
  });

  it('resetLastWordTileTypes clears the snapshot', () => {
    const tiles: Tile[] = [{ type: 'fire', activationEffect: 'burn' }];
    const { result, rerender } = renderHook(
      (p: Props) => useLastWordTileTypes(p),
      { initialProps: { wordsFoundLength: 0, tiles } as Props },
    );
    rerender({ wordsFoundLength: 1, tiles });
    expect(result.current.lastWordTileTypes).toEqual(['fire']);
    act(() => { result.current.resetLastWordTileTypes(); });
    expect(result.current.lastWordTileTypes).toEqual([]);
  });

  it('does not update on tile changes without a new word', () => {
    const tiles: Tile[] = [{ type: 'fire', activationEffect: 'burn' }];
    const { result, rerender } = renderHook(
      (p: Props) => useLastWordTileTypes(p),
      { initialProps: { wordsFoundLength: 1, tiles } as Props },
    );
    const nextTiles: Tile[] = [{ type: 'ice', activationEffect: 'freeze' }];
    rerender({ wordsFoundLength: 1, tiles: nextTiles });
    expect(result.current.lastWordTileTypes).toEqual([]);
  });
});
