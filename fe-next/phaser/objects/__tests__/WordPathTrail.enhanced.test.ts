/**
 * WordPathTrail enhanced features — head bubble, flowing dash, spark particles, connection flash.
 *
 * RED phase: tests for new trail personality features.
 */

import Phaser from 'phaser';
import { WordPathTrail } from '../WordPathTrail';
import type { GridLayout } from '@/lib/phaser/logic/GridGeometry';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

function makeLayout(tiles: Array<{ row: number; col: number; x: number; y: number }>): GridLayout {
  return {
    tileSize: 80,
    gap: 8,
    offsetX: 0,
    offsetY: 0,
    rows: 4,
    cols: 4,
    tiles,
  };
}

function makePath(count: number) {
  const tiles: Array<{ row: number; col: number; x: number; y: number }> = [];
  const cells: Array<{ row: number; col: number }> = [];
  for (let i = 0; i < count; i++) {
    tiles.push({ row: 0, col: i, x: i * 80, y: 0 });
    cells.push({ row: 0, col: i });
  }
  return { tiles, cells };
}

// ─── Part A: Trail Head Bubble ───────────────────────────────────────────────

describe('WordPathTrail head bubble', () => {
  it('draws a filled circle at the last tile position', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const layout = makeLayout([
      { row: 0, col: 0, x: 50, y: 50 },
      { row: 0, col: 1, x: 130, y: 50 },
    ]);

    (trail.fillCircle as jest.Mock).mockClear();
    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xffffff);

    // Should draw a head bubble at the LAST tile (130, 50)
    const calls = (trail.fillCircle as jest.Mock).mock.calls;
    const lastTileCall = calls.find(
      (c: number[]) => c[0] === 130 && c[1] === 50
    );
    expect(lastTileCall).toBeDefined();
  });

  it('draws an outer glow circle (larger radius) at the head position', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const layout = makeLayout([
      { row: 0, col: 0, x: 50, y: 50 },
      { row: 0, col: 1, x: 130, y: 50 },
    ]);

    (trail.fillCircle as jest.Mock).mockClear();
    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xffffff);

    // Head has two circles: inner (radius 8) and outer glow (radius 14)
    const headCalls = (trail.fillCircle as jest.Mock).mock.calls.filter(
      (c: number[]) => c[0] === 130 && c[1] === 50
    );
    expect(headCalls.length).toBeGreaterThanOrEqual(2);
    // Outer should have larger radius than inner
    const radii = headCalls.map((c: number[]) => c[2]);
    expect(Math.max(...radii)).toBeGreaterThan(Math.min(...radii));
  });

  it('creates a pulsing tween on the head bubble', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const layout = makeLayout([
      { row: 0, col: 0, x: 50, y: 50 },
      { row: 0, col: 1, x: 130, y: 50 },
    ]);

    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xffffff);

    // Should start a pulse tween via scene.tweens.add
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('plays pop animation when a new tile is added', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const layout = makeLayout([
      { row: 0, col: 0, x: 0, y: 0 },
      { row: 0, col: 1, x: 80, y: 0 },
      { row: 0, col: 2, x: 160, y: 0 },
    ]);

    // First update: 2 tiles
    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xffffff);
    (scene.tweens.add as jest.Mock).mockClear();

    // Second update: 3 tiles (new tile added)
    trail.updatePath(
      [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
      layout,
      0xffffff,
    );

    // Pop tween should fire for the head bubble
    expect(scene.tweens.add).toHaveBeenCalled();
  });
});

// ─── Part B: Flowing Dash Animation ─────────────────────────────────────────

describe('WordPathTrail flowing dash', () => {
  it('starts a flow timer when path has 2+ tiles', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const layout = makeLayout([
      { row: 0, col: 0, x: 0, y: 0 },
      { row: 0, col: 1, x: 80, y: 0 },
    ]);

    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xffffff);

    // Flow timer created via scene.time.addEvent
    expect(scene.time.addEvent).toHaveBeenCalled();
  });

  it('stops the flow timer on clear', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const layout = makeLayout([
      { row: 0, col: 0, x: 0, y: 0 },
      { row: 0, col: 1, x: 80, y: 0 },
    ]);

    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xffffff);

    // Capture the timer reference
    const timerRef = (scene.time.addEvent as jest.Mock).mock.results[0]?.value;

    trail.clear();

    // Timer should be removed
    expect(scene.time.removeEvent).toHaveBeenCalled();
  });

  it('does not create multiple timers on successive updatePath calls', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const layout = makeLayout([
      { row: 0, col: 0, x: 0, y: 0 },
      { row: 0, col: 1, x: 80, y: 0 },
      { row: 0, col: 2, x: 160, y: 0 },
    ]);

    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xffffff);
    trail.updatePath(
      [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
      layout,
      0xffffff,
    );

    // Should remove old timer before creating new one, resulting in 2 addEvent calls
    // but also removeEvent calls to clean up the first
    const addCalls = (scene.time.addEvent as jest.Mock).mock.calls.length;
    const removeCalls = (scene.time.removeEvent as jest.Mock).mock.calls.length;
    expect(addCalls).toBe(2);
    expect(removeCalls).toBeGreaterThanOrEqual(1);
  });
});

// ─── Part C: Spark Particles ────────────────────────────────────────────────

describe('WordPathTrail spark particles', () => {
  it('does not create spark emitter for paths shorter than 3 tiles', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const { tiles, cells } = makePath(2);
    const layout = makeLayout(tiles);

    (scene.add.particles as jest.Mock).mockClear();
    trail.updatePath(cells, layout, 0xffffff);

    expect(scene.add.particles).not.toHaveBeenCalled();
  });

  it('creates a spark particle emitter for paths of 3+ tiles', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const { tiles, cells } = makePath(3);
    const layout = makeLayout(tiles);

    (scene.add.particles as jest.Mock).mockClear();
    trail.updatePath(cells, layout, 0xffffff);

    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('cleans up spark emitter on clear', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const { tiles, cells } = makePath(4);
    const layout = makeLayout(tiles);

    // Provide a trackable mock particle emitter
    const mockEmitter = { destroy: jest.fn(), explode: jest.fn() };
    (scene.add.particles as jest.Mock).mockReturnValueOnce(mockEmitter);

    trail.updatePath(cells, layout, 0xffffff);
    trail.clear();

    expect(mockEmitter.destroy).toHaveBeenCalled();
  });

  it('emits farewell burst on clear when path had 3+ tiles', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const { tiles, cells } = makePath(5);
    const layout = makeLayout(tiles);

    const mockEmitter = { destroy: jest.fn(), explode: jest.fn() };
    (scene.add.particles as jest.Mock).mockReturnValueOnce(mockEmitter);

    trail.updatePath(cells, layout, 0xffffff);
    trail.clear();

    // Farewell burst: explode() should have been called before destroy
    expect(mockEmitter.explode).toHaveBeenCalled();
  });
});

// ─── Part D: Connection Flash ───────────────────────────────────────────────

describe('WordPathTrail connection flash', () => {
  it('draws a flash line when a new tile is added to the path', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const layout = makeLayout([
      { row: 0, col: 0, x: 0, y: 0 },
      { row: 0, col: 1, x: 80, y: 0 },
      { row: 0, col: 2, x: 160, y: 0 },
    ]);

    // First: 2 tiles
    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xffffff);
    (trail.lineStyle as jest.Mock).mockClear();

    // Add third tile — should draw a connection flash
    trail.updatePath(
      [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
      layout,
      0xffffff,
    );

    // The flash layer uses white (0xffffff) with high alpha
    const whiteLineCalls = (trail.lineStyle as jest.Mock).mock.calls.filter(
      (c: unknown[]) => c[1] === 0xffffff && (c[2] as number) >= 0.7
    );
    expect(whiteLineCalls.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Accessibility ──────────────────────────────────────────────────────────

describe('WordPathTrail reduceMotion', () => {
  it('skips head pulse tween when reduceMotion is true', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene, { reduceMotion: true });
    const layout = makeLayout([
      { row: 0, col: 0, x: 0, y: 0 },
      { row: 0, col: 1, x: 80, y: 0 },
    ]);

    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xffffff);

    // No tweens should be created
    expect(scene.tweens.add).not.toHaveBeenCalled();
  });

  it('skips spark particles when reduceMotion is true', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene, { reduceMotion: true });
    const { tiles, cells } = makePath(4);
    const layout = makeLayout(tiles);

    (scene.add.particles as jest.Mock).mockClear();
    trail.updatePath(cells, layout, 0xffffff);

    expect(scene.add.particles).not.toHaveBeenCalled();
  });

  it('skips flow timer when reduceMotion is true', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene, { reduceMotion: true });
    const layout = makeLayout([
      { row: 0, col: 0, x: 0, y: 0 },
      { row: 0, col: 1, x: 80, y: 0 },
    ]);

    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xffffff);

    expect(scene.time.addEvent).not.toHaveBeenCalled();
  });
});

// ─── isLowEnd ───────────────────────────────────────────────────────────────

describe('WordPathTrail isLowEnd', () => {
  it('skips spark particles when isLowEnd is true', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene, { isLowEnd: true });
    const { tiles, cells } = makePath(4);
    const layout = makeLayout(tiles);

    (scene.add.particles as jest.Mock).mockClear();
    trail.updatePath(cells, layout, 0xffffff);

    expect(scene.add.particles).not.toHaveBeenCalled();
  });

  it('still draws head bubble when isLowEnd is true', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene, { isLowEnd: true });
    const layout = makeLayout([
      { row: 0, col: 0, x: 0, y: 0 },
      { row: 0, col: 1, x: 80, y: 0 },
    ]);

    (trail.fillCircle as jest.Mock).mockClear();
    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xffffff);

    // Head bubble is drawn at last tile even on low-end
    const headCalls = (trail.fillCircle as jest.Mock).mock.calls.filter(
      (c: number[]) => c[0] === 80 && c[1] === 0
    );
    expect(headCalls.length).toBeGreaterThanOrEqual(1);
  });
});
