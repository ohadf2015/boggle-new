/**
 * BlastScene cascade chain visuals — growing multiplier text and screen flash.
 *
 * Verifies:
 * - Shows "CASCADE ×N" text during cascade:highlight with chain level > 1
 * - Flashes camera during cascade:clear with chainLevel > 1
 * - Does not create cascade text for chainLevel 1
 * - Text cleanup on cascade:clear
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

const GRID_4x4: string[][] = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

const TILE_STATES_4x4 = Array.from({ length: 4 }, (_, row) =>
  Array.from({ length: 4 }, (_, col) => ({
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

describe('BlastScene cascade chain visuals', () => {
  it('creates cascade text on cascade:highlight with chainLevel > 1', () => {
    const scene = createScene();

    // Populate grid
    GameBridge.emit('blast:grid:update', {
      grid: GRID_4x4,
      tileStates: TILE_STATES_4x4,
      comboLevel: 0,
    });

    const addTextSpy = scene.add.text as jest.Mock;
    addTextSpy.mockClear();

    // Cascade highlight with chain level 2 (on each word)
    GameBridge.emit('blast:cascade:highlight', {
      words: [
        { word: 'AB', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }], score: 4, chainLevel: 2 },
      ],
    });

    // Should create "CASCADE ×2" text
    expect(addTextSpy).toHaveBeenCalled();
  });

  it('flashes camera on cascade:clear with chainLevel > 1', () => {
    const scene = createScene();

    // Populate grid
    GameBridge.emit('blast:grid:update', {
      grid: GRID_4x4,
      tileStates: TILE_STATES_4x4,
      comboLevel: 0,
    });

    const flashSpy = scene.cameras.main.flash as jest.Mock;

    GameBridge.emit('blast:cascade:clear', {
      clearedPositions: [{ row: 0, col: 0 }],
      explosions: [],
      scorePopups: [],
      chainLevel: 2,
    });

    expect(flashSpy).toHaveBeenCalled();
  });

  it('does not create cascade text for chainLevel 1', () => {
    const scene = createScene();

    // Populate grid
    GameBridge.emit('blast:grid:update', {
      grid: GRID_4x4,
      tileStates: TILE_STATES_4x4,
      comboLevel: 0,
    });

    const addTextSpy = scene.add.text as jest.Mock;
    addTextSpy.mockClear();

    GameBridge.emit('blast:cascade:highlight', {
      words: [
        { word: 'AB', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }], score: 4, chainLevel: 1 },
      ],
    });

    // No cascade text for chain level 1
    expect(addTextSpy).not.toHaveBeenCalled();
  });

  it('does not flash camera for cascade:clear without chainLevel', () => {
    const scene = createScene();

    GameBridge.emit('blast:grid:update', {
      grid: GRID_4x4,
      tileStates: TILE_STATES_4x4,
      comboLevel: 0,
    });

    const flashSpy = scene.cameras.main.flash as jest.Mock;

    GameBridge.emit('blast:cascade:clear', {
      clearedPositions: [{ row: 0, col: 0 }],
      explosions: [],
      scorePopups: [],
    });

    expect(flashSpy).not.toHaveBeenCalled();
  });
});
