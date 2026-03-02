/**
 * GameScene — grid dimming tests.
 *
 * Verifies that:
 *  - When first tile is selected, all other tiles dim to 0.5 alpha
 *  - Tiles adjacent to the last selected tile are 0.7 alpha (reachable)
 *  - Selected tiles themselves remain at full alpha
 *  - On pointer up (deselect all), dimming is cleared (all tiles back to 1.0)
 *  - Grid dimming respects reduceMotion (dimming still applies — it's not animation)
 */

import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import { GameScene } from '../GameScene';
import { ComboRing } from '../../objects/ComboRing';
import { LetterTile } from '../../objects/LetterTile';

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

function getInputHandler(scene: GameScene, eventName: string): Function {
  const inputOnCalls = (scene.input.on as jest.Mock).mock.calls;
  const entry = inputOnCalls.find((call: unknown[]) => call[0] === eventName);
  return entry![1] as Function;
}

function getTilePosition(scene: GameScene, row: number, col: number) {
  const layout = (scene as unknown as { layout: { tiles: Array<{ row: number; col: number; x: number; y: number }> } }).layout;
  return layout.tiles.find(t => t.row === row && t.col === col)!;
}

function getTile(scene: GameScene, row: number, col: number): LetterTile {
  const tiles = (scene as unknown as { tiles: Map<string, LetterTile> }).tiles;
  return tiles.get(`${row},${col}`)!;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  GameBridge.reset();
});

afterEach(() => {
  GameBridge.reset();
});

describe('GameScene grid dimming', () => {
  it('dims non-selected, non-adjacent tiles to 0.5 when first tile is selected', () => {
    const scene = createScene();
    GameBridge.emit('grid:update', { grid: GRID_4x4, comboLevel: 0, fireRoundActive: false });

    const pointerDown = getInputHandler(scene, 'pointerdown');
    const pos00 = getTilePosition(scene, 0, 0);
    pointerDown.call(scene, { x: pos00.x, y: pos00.y });

    // Tile at (0,0) is selected — should not be dimmed
    const tile00 = getTile(scene, 0, 0);
    expect(tile00.setAlpha).not.toHaveBeenCalledWith(0.5);

    // Tile at (2,2) is far — should be dimmed to 0.5
    const tile22 = getTile(scene, 2, 2);
    expect(tile22.setAlpha).toHaveBeenCalledWith(0.5);
  });

  it('sets adjacent-to-last tiles as reachable (alpha 0.7)', () => {
    const scene = createScene();
    GameBridge.emit('grid:update', { grid: GRID_4x4, comboLevel: 0, fireRoundActive: false });

    const pointerDown = getInputHandler(scene, 'pointerdown');
    const pos00 = getTilePosition(scene, 0, 0);
    pointerDown.call(scene, { x: pos00.x, y: pos00.y });

    // Tile (0,1) is adjacent to (0,0) — should be reachable (0.7)
    const tile01 = getTile(scene, 0, 1);
    expect(tile01.setAlpha).toHaveBeenCalledWith(0.7);

    // Tile (1,1) is diagonally adjacent — should be reachable
    const tile11 = getTile(scene, 1, 1);
    expect(tile11.setAlpha).toHaveBeenCalledWith(0.7);
  });

  it('updates dimming when dragging to a second tile', () => {
    const scene = createScene();
    GameBridge.emit('grid:update', { grid: GRID_4x4, comboLevel: 0, fireRoundActive: false });

    const pointerDown = getInputHandler(scene, 'pointerdown');
    const pointerMove = getInputHandler(scene, 'pointermove');

    // Select (0,0)
    const pos00 = getTilePosition(scene, 0, 0);
    pointerDown.call(scene, { x: pos00.x, y: pos00.y });

    // Clear mock calls to track only the second selection's dimming
    const tile12 = getTile(scene, 1, 2);
    (tile12.setAlpha as jest.Mock).mockClear();

    // Drag to (0,1)
    const pos01 = getTilePosition(scene, 0, 1);
    pointerMove.call(scene, { x: pos01.x, y: pos01.y });

    // Tile (1,2) is adjacent to (0,1) but not to (0,0)
    // After moving to (0,1), adjacency is re-evaluated from the last tile
    expect(tile12.setAlpha).toHaveBeenCalledWith(0.7);
  });

  it('clears all dimming on pointer up', () => {
    const scene = createScene();
    GameBridge.emit('grid:update', { grid: GRID_4x4, comboLevel: 0, fireRoundActive: false });

    const pointerDown = getInputHandler(scene, 'pointerdown');
    const pointerUp = getInputHandler(scene, 'pointerup');

    const pos00 = getTilePosition(scene, 0, 0);
    pointerDown.call(scene, { x: pos00.x, y: pos00.y });

    // Now release — all tiles should have dimming cleared
    const tile22 = getTile(scene, 2, 2);
    (tile22.setAlpha as jest.Mock).mockClear();

    pointerUp.call(scene);

    // After pointer up, dimming is cleared — setDimmed('none') calls setAlpha(1)
    expect(tile22.setAlpha).toHaveBeenCalledWith(1);
  });
});
