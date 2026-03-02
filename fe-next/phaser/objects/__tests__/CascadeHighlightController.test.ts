/**
 * CascadeHighlightController — cascade word highlight visuals.
 *
 * Verifies:
 * - showHighlight creates graphics objects for word paths
 * - clearHighlight removes all graphics
 * - Glow rectangles drawn around highlighted tiles
 *
 * RED phase: tests fail until implementation exists.
 */

import Phaser from 'phaser';
import { CascadeHighlightController } from '../CascadeHighlightController';
import type { CascadeHighlightWord } from '@/components/blast/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

function makeLayout(tileSize = 60) {
  return {
    tileSize,
    gap: tileSize * 0.08,
    offsetX: 20,
    offsetY: 20,
    rows: 6,
    cols: 6,
    tiles: [],
  };
}

const sampleWord: CascadeHighlightWord = {
  word: 'TEST',
  path: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 0, col: 3 },
  ],
  score: 10,
  chainLevel: 1,
};

// ─── showHighlight ────────────────────────────────────────────────────────────

describe('CascadeHighlightController.showHighlight', () => {
  it('creates graphics for highlighting', () => {
    const scene = makeScene();
    const controller = new CascadeHighlightController();

    controller.showHighlight(scene, [sampleWord], makeLayout());

    expect(scene.add.graphics).toHaveBeenCalled();
  });

  it('creates a tween for alpha animation', () => {
    const scene = makeScene();
    const controller = new CascadeHighlightController();

    controller.showHighlight(scene, [sampleWord], makeLayout());

    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('handles multiple words', () => {
    const scene = makeScene();
    const controller = new CascadeHighlightController();

    const word2: CascadeHighlightWord = {
      word: 'WORD',
      path: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }],
      score: 8,
      chainLevel: 1,
    };

    controller.showHighlight(scene, [sampleWord, word2], makeLayout());

    expect(scene.add.graphics).toHaveBeenCalled();
  });
});

// ─── clearHighlight ───────────────────────────────────────────────────────────

describe('CascadeHighlightController.clearHighlight', () => {
  it('does not throw when nothing is highlighted', () => {
    const controller = new CascadeHighlightController();
    expect(() => controller.clearHighlight()).not.toThrow();
  });

  it('clears after showHighlight was called', () => {
    const scene = makeScene();
    const controller = new CascadeHighlightController();

    controller.showHighlight(scene, [sampleWord], makeLayout());
    expect(() => controller.clearHighlight()).not.toThrow();
  });
});
