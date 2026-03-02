/**
 * WordPathTrail — bezier path renderer tests.
 *
 * Verifies that the trail draws using only Phaser.GameObjects.Graphics
 * path methods (moveTo / lineTo / strokePath) — NOT quadraticCurveTo,
 * which does not exist on real Phaser Graphics objects.
 *
 * RED phase: tests fail until drawLayer uses manual bezier sampling.
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

// ─── Constructor ──────────────────────────────────────────────────────────────

describe('WordPathTrail constructor', () => {
  it('adds itself to the scene', () => {
    const scene = makeScene();
    new WordPathTrail(scene);
    expect(scene.add.existing).toHaveBeenCalled();
  });

  it('sets depth above tiles', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    expect(trail.setDepth).toHaveBeenCalledWith(10);
  });
});

// ─── updatePath ───────────────────────────────────────────────────────────────

describe('WordPathTrail.updatePath', () => {
  it('does not draw when fewer than 2 cells are selected', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const layout = makeLayout([{ row: 0, col: 0, x: 100, y: 100 }]);

    (trail.lineTo as jest.Mock).mockClear();
    trail.updatePath([{ row: 0, col: 0 }], layout, 0xffffff);

    expect(trail.lineTo).not.toHaveBeenCalled();
  });

  it('calls lineStyle 3 times (3 glow layers) for a valid path', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const layout = makeLayout([
      { row: 0, col: 0, x: 0, y: 0 },
      { row: 0, col: 1, x: 80, y: 0 },
    ]);

    (trail.lineStyle as jest.Mock).mockClear();
    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xffffff);

    expect(trail.lineStyle).toHaveBeenCalledTimes(3);
  });

  it('calls strokePath at least once per glow layer', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const layout = makeLayout([
      { row: 0, col: 0, x: 0, y: 0 },
      { row: 0, col: 1, x: 80, y: 0 },
    ]);

    (trail.strokePath as jest.Mock).mockClear();
    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xffffff);

    expect(trail.strokePath).toHaveBeenCalledTimes(3);
  });

  it('uses lineTo (not quadraticCurveTo) to draw curves', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const layout = makeLayout([
      { row: 0, col: 0, x: 0, y: 0 },
      { row: 0, col: 1, x: 80, y: 0 },
      { row: 0, col: 2, x: 160, y: 0 },
    ]);

    (trail.lineTo as jest.Mock).mockClear();
    trail.updatePath(
      [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
      layout,
      0xffffff
    );

    expect(trail.lineTo).toHaveBeenCalled();
    // quadraticCurveTo must NOT be used — it doesn't exist on real Phaser Graphics
    expect((trail as unknown as Record<string, unknown>).quadraticCurveTo).toBeUndefined();
  });

  it('draws a dot at the first tile', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const layout = makeLayout([
      { row: 0, col: 0, x: 50, y: 50 },
      { row: 0, col: 1, x: 130, y: 50 },
    ]);

    (trail.fillCircle as jest.Mock).mockClear();
    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xffffff);

    expect(trail.fillCircle).toHaveBeenCalledWith(50, 50, expect.any(Number));
  });

  it('passes the color through to lineStyle', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const layout = makeLayout([
      { row: 0, col: 0, x: 0, y: 0 },
      { row: 0, col: 1, x: 80, y: 0 },
    ]);

    (trail.lineStyle as jest.Mock).mockClear();
    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xff0000);

    const calls = (trail.lineStyle as jest.Mock).mock.calls;
    expect(calls.every((c: unknown[]) => c[1] === 0xff0000)).toBe(true);
  });
});

// ─── clear ────────────────────────────────────────────────────────────────────

describe('WordPathTrail.clear', () => {
  it('stops drawing after clear — no lineTo on next single-tile update', () => {
    const scene = makeScene();
    const trail = new WordPathTrail(scene);
    const layout = makeLayout([
      { row: 0, col: 0, x: 0, y: 0 },
      { row: 0, col: 1, x: 80, y: 0 },
    ]);

    // Draw a 2-tile path, then clear
    trail.updatePath([{ row: 0, col: 0 }, { row: 0, col: 1 }], layout, 0xffffff);
    trail.clear();

    // Update with single tile — should not draw
    (trail.lineTo as jest.Mock).mockClear();
    trail.updatePath([{ row: 0, col: 0 }], layout, 0xffffff);

    expect(trail.lineTo).not.toHaveBeenCalled();
  });
});
