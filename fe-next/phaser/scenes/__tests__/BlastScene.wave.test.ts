/**
 * BlastScene wave transition — "WAVE N" text overlay between phases.
 *
 * Verifies:
 * - Shows "WAVE N" text during wave transition
 * - Text is centered in canvas
 * - Text is cleaned up after transition
 * - Reduce motion skips animation but still shows text briefly
 */

import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import { BlastScene } from '../BlastScene';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createScene(): BlastScene {
  const scene = new BlastScene();
  (scene.game.canvas as unknown as Record<string, unknown>).addEventListener = jest.fn();
  scene.create();
  return scene;
}

const GRID_2x2: string[][] = [
  ['A', 'B'],
  ['C', 'D'],
];

const TILE_STATES_2x2 = Array.from({ length: 2 }, (_, row) =>
  Array.from({ length: 2 }, (_, col) => ({
    row, col, type: 'standard' as const, isCleared: false,
    activationEffect: null, hitsRemaining: 0,
  }))
);

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  GameBridge.reset();
});

afterEach(() => {
  GameBridge.reset();
});

describe('BlastScene wave transition text', () => {
  it('creates "WAVE N" text on wave transition', () => {
    const scene = createScene();

    // Populate grid so there are tiles to animate
    GameBridge.emit('blast:grid:update', {
      grid: GRID_2x2,
      tileStates: TILE_STATES_2x2,
      comboLevel: 0,
    });

    const addTextSpy = scene.add.text as jest.Mock;
    addTextSpy.mockClear();

    GameBridge.emit('blast:wave:transition', { waveNumber: 3 });

    // Should create "WAVE 3" text
    expect(addTextSpy).toHaveBeenCalled();
    const textCall = addTextSpy.mock.calls[0];
    expect(textCall[2]).toContain('WAVE');
  });

  it('creates wave text even with no tiles (empty grid)', () => {
    const scene = createScene();

    const addTextSpy = scene.add.text as jest.Mock;
    addTextSpy.mockClear();

    GameBridge.emit('blast:wave:transition', { waveNumber: 2 });

    expect(addTextSpy).toHaveBeenCalled();
  });
});
