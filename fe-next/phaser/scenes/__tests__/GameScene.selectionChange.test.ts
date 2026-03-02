/**
 * GameScene — selection:change emission tests.
 *
 * Verifies that selectTile emits the selection:change bridge event
 * with the current path cells whenever a tile is selected.
 */

import { GameBridge, type BridgeEvents } from '@/lib/phaser/bridge/GameBridge';
import { GameScene } from '../GameScene';
import { ComboRing } from '../../objects/ComboRing';

// Mock ComboRing.play to prevent tween crashes
jest.spyOn(ComboRing.prototype, 'play').mockImplementation(() => {});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createScene(): GameScene {
  const scene = new GameScene();
  (scene.game.canvas as Record<string, unknown>).addEventListener = jest.fn();
  scene.create();
  return scene;
}

const GRID_4x4: string[][] = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  GameBridge.reset();
});

afterEach(() => {
  GameBridge.reset();
});

describe('GameScene selection:change emission', () => {
  it('should emit selection:change when a tile is selected via pointer', () => {
    const scene = createScene();
    const selectionChanges: BridgeEvents['selection:change'][] = [];

    // Initialize grid
    GameBridge.emit('grid:update', {
      grid: GRID_4x4,
      comboLevel: 0,
      fireRoundActive: false,
    });

    // Subscribe to selection:change
    GameBridge.on('selection:change', (payload) => selectionChanges.push(payload));

    // Simulate pointer down on first tile
    // We need to trigger through the input system — find the POINTER_DOWN handler
    const inputOnCalls = (scene.input.on as jest.Mock).mock.calls;
    const pointerDownHandler = inputOnCalls.find(
      (call: unknown[]) => call[0] === 'pointerdown'
    );

    expect(pointerDownHandler).toBeDefined();

    // Get tile position from layout so pointer hit-detection works
    const layout = (scene as unknown as { layout: { tiles: Array<{ row: number; col: number; x: number; y: number }> } }).layout;
    const firstTile = layout?.tiles?.[0];

    if (firstTile) {
      // Call the pointerdown handler with a pointer at the tile position
      const handler = pointerDownHandler![1] as (pointer: { x: number; y: number }) => void;
      handler.call(scene, { x: firstTile.x, y: firstTile.y });

      expect(selectionChanges.length).toBe(1);
      expect(selectionChanges[0].cells).toHaveLength(1);
      expect(selectionChanges[0].cells[0]).toMatchObject({
        row: firstTile.row,
        col: firstTile.col,
      });
    }

    void scene;
  });
});
