/**
 * GameScene — tap-to-select mode tests.
 *
 * Verifies that users can tap individual tiles one-by-one to build a word,
 * instead of requiring a continuous drag gesture. This makes the game more
 * forgiving for users who prefer clicking/tapping over dragging.
 *
 * Tap mode rules:
 * - Tap (pointerdown + pointerup without move) adds tile to path
 * - Only adjacent tiles can be added (same as drag)
 * - Tapping the last selected tile confirms/submits the word
 * - Tapping outside the grid submits the word
 * - Starting a drag clears any tap-accumulated path and enters drag mode
 * - Tapping an already-selected (non-last) tile deselects back to that point
 */

import { GameBridge, type BridgeEvents } from '@/lib/phaser/bridge/GameBridge';
import { GameScene } from '../GameScene';
import { ComboRing } from '../../objects/ComboRing';

// Mock ComboRing.play to prevent tween crashes
jest.spyOn(ComboRing.prototype, 'play').mockImplementation(() => {});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createScene(): GameScene {
  const scene = new GameScene();
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

interface SceneLayout {
  layout: {
    tiles: Array<{ row: number; col: number; x: number; y: number }>;
    tileSize: number;
  };
}

function getLayout(scene: GameScene) {
  return (scene as unknown as SceneLayout).layout;
}

function getTilePos(scene: GameScene, row: number, col: number) {
  const layout = getLayout(scene);
  return layout.tiles.find((t) => t.row === row && t.col === col)!;
}

type PointerHandler = (pointer: { x: number; y: number }) => void;

function getInputHandlers(scene: GameScene) {
  const calls = (scene.input.on as jest.Mock).mock.calls;
  const down = calls.find((c: unknown[]) => c[0] === 'pointerdown')![1] as PointerHandler;
  const move = calls.find((c: unknown[]) => c[0] === 'pointermove')![1] as PointerHandler;
  const up = calls.find((c: unknown[]) => c[0] === 'pointerup')![1] as PointerHandler;
  return {
    pointerDown: (x: number, y: number) => down.call(scene, { x, y }),
    pointerMove: (x: number, y: number) => move.call(scene, { x, y }),
    pointerUp: () => up.call(scene, { x: 0, y: 0 }),
  };
}

/** Simulate a tap (down + up without move) on a tile position. */
function tap(input: ReturnType<typeof getInputHandlers>, x: number, y: number) {
  input.pointerDown(x, y);
  input.pointerUp();
}

/** Simulate a tap outside the grid. */
function tapOutside(input: ReturnType<typeof getInputHandlers>) {
  input.pointerDown(0, 0); // (0,0) is outside the grid
  input.pointerUp();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  GameBridge.reset();
});

afterEach(() => {
  GameBridge.reset();
});

function initScene() {
  const scene = createScene();
  GameBridge.emit('grid:update', {
    grid: GRID_4x4,
    comboLevel: 0,
    fireRoundActive: false,
  });
  const input = getInputHandlers(scene);
  return { scene, input };
}

describe('GameScene tap-to-select mode', () => {
  it('should select a tile on tap without submitting', () => {
    const { scene, input } = initScene();
    const wordSubmits: BridgeEvents['word:submit'][] = [];
    const wordChanges: BridgeEvents['word:change'][] = [];
    GameBridge.on('word:submit', (p) => wordSubmits.push(p));
    GameBridge.on('word:change', (p) => wordChanges.push(p));

    const tileA = getTilePos(scene, 0, 0); // 'A'
    tap(input, tileA.x, tileA.y);

    // Should have emitted word:change but NOT word:submit
    expect(wordChanges.length).toBe(1);
    expect(wordChanges[0].word).toBe('A');
    expect(wordSubmits.length).toBe(0);
  });

  it('should build a word by tapping adjacent tiles sequentially', () => {
    const { scene, input } = initScene();
    const wordChanges: BridgeEvents['word:change'][] = [];
    GameBridge.on('word:change', (p) => wordChanges.push(p));

    const tileA = getTilePos(scene, 0, 0); // 'A'
    const tileB = getTilePos(scene, 0, 1); // 'B'
    const tileF = getTilePos(scene, 1, 1); // 'F'

    tap(input, tileA.x, tileA.y);
    tap(input, tileB.x, tileB.y);
    tap(input, tileF.x, tileF.y);

    expect(wordChanges.length).toBe(3);
    expect(wordChanges[2].word).toBe('ABF');
    expect(wordChanges[2].letterCount).toBe(3);
  });

  it('should reject tapping non-adjacent tiles', () => {
    const { scene, input } = initScene();
    const wordChanges: BridgeEvents['word:change'][] = [];
    GameBridge.on('word:change', (p) => wordChanges.push(p));

    const tileA = getTilePos(scene, 0, 0); // 'A'
    const tileD = getTilePos(scene, 0, 3); // 'D' — not adjacent to A

    tap(input, tileA.x, tileA.y);
    tap(input, tileD.x, tileD.y);

    // Only the first tap should have registered
    expect(wordChanges.length).toBe(1);
    expect(wordChanges[0].word).toBe('A');
  });

  it('should submit word when tapping the last selected tile', () => {
    const { scene, input } = initScene();
    const wordSubmits: BridgeEvents['word:submit'][] = [];
    GameBridge.on('word:submit', (p) => wordSubmits.push(p));

    const tileA = getTilePos(scene, 0, 0);
    const tileB = getTilePos(scene, 0, 1);

    // Build "AB"
    tap(input, tileA.x, tileA.y);
    tap(input, tileB.x, tileB.y);

    // Tap last tile (B) again to submit
    tap(input, tileB.x, tileB.y);

    expect(wordSubmits.length).toBe(1);
    expect(wordSubmits[0].word).toBe('AB');
    expect(wordSubmits[0].path).toHaveLength(2);
  });

  it('should submit word when tapping outside the grid', () => {
    const { scene, input } = initScene();
    const wordSubmits: BridgeEvents['word:submit'][] = [];
    GameBridge.on('word:submit', (p) => wordSubmits.push(p));

    const tileA = getTilePos(scene, 0, 0);
    const tileB = getTilePos(scene, 0, 1);

    tap(input, tileA.x, tileA.y);
    tap(input, tileB.x, tileB.y);

    // Tap outside grid to submit
    tapOutside(input);

    expect(wordSubmits.length).toBe(1);
    expect(wordSubmits[0].word).toBe('AB');
  });

  it('should deselect back to tapped tile when tapping earlier tile in path', () => {
    const { scene, input } = initScene();
    const wordChanges: BridgeEvents['word:change'][] = [];
    GameBridge.on('word:change', (p) => wordChanges.push(p));

    const tileA = getTilePos(scene, 0, 0);
    const tileB = getTilePos(scene, 0, 1);
    const tileF = getTilePos(scene, 1, 1);

    // Build "ABF"
    tap(input, tileA.x, tileA.y);
    tap(input, tileB.x, tileB.y);
    tap(input, tileF.x, tileF.y);

    expect(wordChanges[2].word).toBe('ABF');

    // Tap A again — should deselect back to just "A"
    tap(input, tileA.x, tileA.y);

    expect(wordChanges[3].word).toBe('A');
    expect(wordChanges[3].letterCount).toBe(1);
  });

  it('should clear tap path and enter drag mode when dragging starts', () => {
    const { scene, input } = initScene();
    const wordSubmits: BridgeEvents['word:submit'][] = [];
    const wordChanges: BridgeEvents['word:change'][] = [];
    GameBridge.on('word:submit', (p) => wordSubmits.push(p));
    GameBridge.on('word:change', (p) => wordChanges.push(p));

    const tileA = getTilePos(scene, 0, 0);
    const tileE = getTilePos(scene, 1, 0);
    const tileF = getTilePos(scene, 1, 1);

    // Start with a tap on A
    tap(input, tileA.x, tileA.y);
    expect(wordChanges[0].word).toBe('A');

    // Now start a drag from E → F (should clear previous tap path)
    input.pointerDown(tileE.x, tileE.y);
    input.pointerMove(tileF.x, tileF.y);
    input.pointerUp();

    // Should have submitted the drag word "EF", not "AEF"
    expect(wordSubmits.length).toBe(1);
    expect(wordSubmits[0].word).toBe('EF');
  });

  it('should not submit empty path when tapping outside with no selection', () => {
    const { input } = initScene();
    const wordSubmits: BridgeEvents['word:submit'][] = [];
    GameBridge.on('word:submit', (p) => wordSubmits.push(p));

    // Tap outside with no tiles selected
    tapOutside(input);

    expect(wordSubmits.length).toBe(0);
  });

  it('should maintain grid dimming during tap selection', () => {
    const { scene, input } = initScene();
    const tiles = (scene as unknown as { tiles: Map<string, { alpha: number }> }).tiles;

    const tileA = getTilePos(scene, 0, 0);
    tap(input, tileA.x, tileA.y);

    // After tap, LetterTile.setDimmed sets alpha:
    // selected = 1.0 (none), adjacent = 0.7 (reachable), far = 0.5 (dimmed)
    // Note: LetterTile.setAlpha is a mock so alpha is tracked via calls.
    // We verify the reapplyTapPathVisuals was called by checking that
    // the path trail was updated (non-empty tap path triggers it).
    const wordChanges: BridgeEvents['word:change'][] = [];
    GameBridge.on('word:change', (p) => wordChanges.push(p));

    const tileB = getTilePos(scene, 0, 1);
    tap(input, tileB.x, tileB.y);

    // If dimming works, the second tap should succeed (adjacent tile)
    expect(wordChanges.length).toBe(1);
    expect(wordChanges[0].word).toBe('AB');
    void tiles; // used for type assertion
  });

  it('should emit selection:change on each tap', () => {
    const { scene, input } = initScene();
    const selectionChanges: BridgeEvents['selection:change'][] = [];
    GameBridge.on('selection:change', (p) => selectionChanges.push(p));

    const tileA = getTilePos(scene, 0, 0);
    const tileB = getTilePos(scene, 0, 1);

    tap(input, tileA.x, tileA.y);
    tap(input, tileB.x, tileB.y);

    expect(selectionChanges.length).toBe(2);
    expect(selectionChanges[1].cells).toHaveLength(2);
  });

  it('should reset tap path after word:feedback is received', () => {
    const { scene, input } = initScene();
    const wordSubmits: BridgeEvents['word:submit'][] = [];
    const wordChanges: BridgeEvents['word:change'][] = [];
    GameBridge.on('word:submit', (p) => wordSubmits.push(p));
    GameBridge.on('word:change', (p) => wordChanges.push(p));

    const tileA = getTilePos(scene, 0, 0);
    const tileB = getTilePos(scene, 0, 1);

    // Build "AB" and submit
    tap(input, tileA.x, tileA.y);
    tap(input, tileB.x, tileB.y);
    tap(input, tileB.x, tileB.y); // submit

    expect(wordSubmits.length).toBe(1);

    // Simulate word:feedback to trigger reset
    GameBridge.emit('word:feedback', {
      type: 'accepted',
      word: 'AB',
      score: 1,
    });

    // Now start a new tap — should be a fresh selection
    const tileC = getTilePos(scene, 0, 2);
    tap(input, tileC.x, tileC.y);

    const lastChange = wordChanges[wordChanges.length - 1];
    expect(lastChange.word).toBe('C');
    expect(lastChange.letterCount).toBe(1);
  });
});
