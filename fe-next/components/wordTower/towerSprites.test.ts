import { describe, it, expect, vi } from 'vitest';

// paintTile's guarded paths early-return before constructing any real Pixi
// object, so a light stub of pixi.js keeps this suite renderer-free.
vi.mock('pixi.js', () => ({
  Container: class {},
  Graphics: class {},
  Text: class {},
  TextStyle: class {},
}));

import { paintTile, drawBlockSurface, type TileSprite } from './towerSprites';

// Minimal stand-in for a TileSprite. The unguarded paintTile mutates
// color/pending then dereferences tile.shadow / tile.face — so a null on
// either reproduces Sentry JAVASCRIPT-NEXTJS-1CK:
// "Cannot read properties of null (reading 'clear')".
const chainable = () => {
  const g = { clear: vi.fn(() => g), roundRect: vi.fn(() => g), rect: vi.fn(() => g), circle: vi.fn(() => g), fill: vi.fn(() => g), stroke: vi.fn(() => g) };
  return g;
};
const fakeTile = (over: Partial<Record<keyof TileSprite, unknown>>): TileSprite =>
  ({
    destroyed: false,
    face: chainable(),
    shadow: chainable(),
    glyph: null,
    size: 48,
    color: 0x000000,
    pending: false,
    anim: 0,
    ...over,
  }) as unknown as TileSprite;

describe('paintTile teardown guard', () => {
  it('does not throw when shadow graphics is null (stale post-destroy callback)', () => {
    const tile = fakeTile({ shadow: null });
    expect(() => paintTile(tile, 0x00ff00, false)).not.toThrow();
  });

  it('does not throw when face graphics is null', () => {
    const tile = fakeTile({ face: null });
    expect(() => paintTile(tile, 0x00ff00, false)).not.toThrow();
  });

  it('skips drawing entirely when the tile was destroyed mid-tween', () => {
    const shadow = chainable();
    const tile = fakeTile({ destroyed: true, shadow });
    paintTile(tile, 0x00ff00, false);
    expect(shadow.clear).not.toHaveBeenCalled();
  });
});

describe('paintTile isometric bevel', () => {
  it('draws four edge bands (top + base + left + right) so blocks read as 3D bricks, not flat chiclets', () => {
    const face = chainable();
    const tile = fakeTile({ face });
    paintTile(tile, 0x00ff00, false);
    // top strip, base band, left bevel, right bevel
    expect(face.rect).toHaveBeenCalledTimes(4);
  });
});

describe('drawBlockSurface', () => {
  it('paints window grids for the city surface', () => {
    const g = chainable();
    drawBlockSurface(g, 48, 'windows');
    expect(g.fill).toHaveBeenCalled();
    expect(g.rect).toHaveBeenCalled();
  });

  it('paints seam panels + rivets for the orbit surface', () => {
    const g = chainable();
    drawBlockSurface(g, 48, 'panels');
    expect(g.fill).toHaveBeenCalled();
  });

  it('paints glinting facets for deep-space surfaces', () => {
    const g = chainable();
    drawBlockSurface(g, 48, 'facets');
    expect(g.fill).toHaveBeenCalled();
  });

  it('never throws on a torn-down graphics (defensive, like paintTile)', () => {
    expect(() => drawBlockSurface(null as unknown as never, 48, 'windows')).not.toThrow();
  });
});
