/**
 * BlastScene — camera flash + zoom on word acceptance.
 *
 * Tests that handleTilesClear triggers:
 * 1. Camera flash (combo-colored) on word clear
 * 2. Camera zoom punch (1.03x, 300ms) on word clear
 * 3. No camera effects when reduceMotion is true
 *
 * RED phase: tests fail until BlastScene is enhanced.
 */

import { GameBridge, type BridgeEvents } from '@/lib/phaser/bridge/GameBridge';
import { BlastScene } from '../BlastScene';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): BlastScene {
  const scene = new BlastScene();
  (scene.game.canvas as unknown as Record<string, unknown>).addEventListener = jest.fn();
  scene.create();
  return scene;
}

function emitTilesClear(payload?: Partial<BridgeEvents['blast:tiles:clear']>): void {
  GameBridge.emit('blast:tiles:clear', {
    clearedPositions: [{ row: 0, col: 0 }],
    explosions: [],
    scorePopups: [],
    ...payload,
  });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  GameBridge.reset();
});

afterEach(() => {
  GameBridge.reset();
});

// ─── Camera flash on word clear ──────────────────────────────────────────────

describe('BlastScene camera flash on tile clear', () => {

  it('flashes camera when tiles are cleared', () => {
    const scene = makeScene();
    const camera = scene.cameras.main;

    // First set up the grid so tiles exist
    GameBridge.emit('blast:grid:update', {
      grid: [['A']],
      tileStates: [[{ type: 'standard', hitsRemaining: 0, row: 0, col: 0, isCleared: false, activationEffect: null }]],
      comboLevel: 1,
    });

    emitTilesClear();

    expect(camera.flash).toHaveBeenCalled();
  });

  it('zooms camera when tiles are cleared', () => {
    const scene = makeScene();
    const camera = scene.cameras.main;

    GameBridge.emit('blast:grid:update', {
      grid: [['A']],
      tileStates: [[{ type: 'standard', hitsRemaining: 0, row: 0, col: 0, isCleared: false, activationEffect: null }]],
      comboLevel: 1,
    });

    emitTilesClear();

    expect(camera.zoomTo).toHaveBeenCalled();
  });

  it('skips flash and zoom when reduceMotion is true', () => {
    const scene = makeScene();
    // Set reduceMotion via the a11y property
    (scene as unknown as { a11y: { reduceMotion: boolean; isLowEnd: boolean } }).a11y.reduceMotion = true;

    const camera = scene.cameras.main;

    GameBridge.emit('blast:grid:update', {
      grid: [['A']],
      tileStates: [[{ type: 'standard', hitsRemaining: 0, row: 0, col: 0, isCleared: false, activationEffect: null }]],
      comboLevel: 1,
    });

    (camera.flash as jest.Mock).mockClear();
    (camera.zoomTo as jest.Mock).mockClear();

    emitTilesClear();

    expect(camera.flash).not.toHaveBeenCalled();
    expect(camera.zoomTo).not.toHaveBeenCalled();
  });
});
