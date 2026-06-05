// ─── TileRenderer destroyed-guard tests ───────────────────────────────
// Reproduces the production crash "Cannot read properties of null (reading
// 'clear')" (Sentry JAVASCRIPT-NEXTJS-1CW / 1CK / 1KM): a queued tick or a
// state-change redraw runs after the renderer (and its Pixi Graphics) were
// torn down by app.destroy({ children: true }) on fast route unmount.

import { TileRenderer } from '../TileRenderer';
import { Container } from 'pixi.js';
import type { TileRenderConfig, TileData } from '../types';

vi.mock('pixi-filters', () => ({
  GlowFilter: class {
    enabled = true;
  },
}));

vi.mock('pixi.js', () => {
  class MockGraphics {
    clear = vi.fn().mockReturnThis();
    roundRect = vi.fn().mockReturnThis();
    rect = vi.fn().mockReturnThis();
    circle = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
    destroy = vi.fn(function (this: { destroyed: boolean }) {
      this.destroyed = true;
    });
    destroyed = false;
  }
  class MockText {
    anchor = { set: vi.fn() };
    position = { set: vi.fn() };
    scale = { set: vi.fn() };
    style = {};
    text = '';
    x = 0;
    y = 0;
    visible = true;
    constructor(_opts?: unknown) {}
    destroy = vi.fn();
    destroyed = false;
  }
  class MockTextStyle {
    constructor(public opts: unknown) {}
    clone() {
      return new MockTextStyle(this.opts);
    }
  }
  class MockContainer {
    children: unknown[] = [];
    position = { set: vi.fn() };
    scale = { set: vi.fn() };
    x = 0;
    y = 0;
    alpha = 1;
    rotation = 0;
    visible = true;
    sortableChildren = true;
    zIndex = 0;
    filters: unknown = null;
    pivot = { set: vi.fn() };
    eventMode = '';
    cursor = '';
    destroyed = false;
    addChild = vi.fn();
    removeChild = vi.fn();
    destroy = vi.fn(function (this: { destroyed: boolean }) {
      this.destroyed = true;
    });
  }
  return {
    Container: MockContainer,
    Graphics: MockGraphics,
    Text: MockText,
    TextStyle: MockTextStyle,
  };
});

const config: TileRenderConfig = {
  rows: 4,
  cols: 4,
  tileSize: 40,
  gap: 4,
  cornerRadius: 4,
};

const tile = (id: string): TileData => ({
  id,
  row: 0,
  col: 0,
  letter: 'A',
  variant: 'standard',
});

describe('TileRenderer destroyed-guard', () => {
  let parent: Container;
  let renderer: TileRenderer;

  beforeEach(() => {
    parent = new Container();
    renderer = new TileRenderer(parent, config);
  });

  it('update() does not crash after destroy() (post-unmount tick race)', () => {
    renderer.setTiles([tile('a')]);
    renderer.destroy();
    // A rAF tick fires after the renderer was destroyed on route unmount.
    expect(() => renderer.update(0.016)).not.toThrow();
  });

  it('setTiles() redraw does not crash when a tile bg was destroyed by parent', () => {
    renderer.setTiles([tile('a')]);
    // Simulate app.destroy({ children: true }) nulling the Graphics context:
    // its .clear() now throws like production.
    const sprites = (renderer as unknown as {
      tiles: Map<string, { bg: { clear: jest.Mock; destroyed: boolean } }>;
    }).tiles;
    const bg = sprites.get('a')!.bg;
    bg.clear.mockImplementation(() => {
      throw new TypeError("Cannot read properties of null (reading 'clear')");
    });
    bg.destroyed = true;
    // Re-running setTiles for the same id hits the drawTile redraw path.
    expect(() => renderer.setTiles([tile('a')])).not.toThrow();
  });
});
