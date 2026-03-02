/**
 * GameScene — word building momentum tests.
 *
 * As the player builds longer words, the game intensifies:
 * - Path length 4: snap gets 10% bigger (0.83/1.17)
 * - Path length 5+: subtle camera vibration begins
 * - On pointer up: all momentum effects stop
 */

import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import { GameScene } from '../GameScene';
import { ComboRing } from '../../objects/ComboRing';
import { LetterTile } from '../../objects/LetterTile';

jest.spyOn(ComboRing.prototype, 'play').mockImplementation(() => {});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createScene(): GameScene {
  const scene = new GameScene();
  (scene.game.canvas as Record<string, unknown>).addEventListener = jest.fn();
  scene.create();
  return scene;
}

// 5x5 grid so we can build long paths
const GRID_5x5: string[][] = [
  ['A', 'B', 'C', 'D', 'E'],
  ['F', 'G', 'H', 'I', 'J'],
  ['K', 'L', 'M', 'N', 'O'],
  ['P', 'Q', 'R', 'S', 'T'],
  ['U', 'V', 'W', 'X', 'Y'],
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

function selectPath(scene: GameScene, cells: [number, number][]): void {
  const pointerDown = getInputHandler(scene, 'pointerdown');
  const pointerMove = getInputHandler(scene, 'pointermove');

  const [firstRow, firstCol] = cells[0];
  const firstPos = getTilePosition(scene, firstRow, firstCol);
  pointerDown.call(scene, { x: firstPos.x, y: firstPos.y });

  for (let i = 1; i < cells.length; i++) {
    const [row, col] = cells[i];
    const pos = getTilePosition(scene, row, col);
    pointerMove.call(scene, { x: pos.x, y: pos.y });
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  GameBridge.reset();
});

afterEach(() => {
  GameBridge.reset();
});

describe('GameScene word building momentum', () => {
  it('at path length 4, snap uses intensified scale (0.83/1.17)', () => {
    const scene = createScene();
    GameBridge.emit('grid:update', { grid: GRID_5x5, comboLevel: 0, fireRoundActive: false });

    // Build a 4-letter path: A(0,0) → B(0,1) → C(0,2) → D(0,3)
    selectPath(scene, [[0, 0], [0, 1], [0, 2], [0, 3]]);

    // The 4th tile select should use intensified snap
    // Check the last tween added — should have scaleX.to = 0.83
    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const intensifiedSnap = tweenCalls.find((call: unknown[]) => {
      const config = call[0] as Record<string, unknown>;
      const scaleX = config.scaleX;
      if (typeof scaleX === 'object' && scaleX !== null) {
        return (scaleX as Record<string, number>).to === 0.83;
      }
      return false;
    });
    expect(intensifiedSnap).toBeDefined();
  });

  it('at path length 5, starts subtle camera vibration', () => {
    const scene = createScene();
    GameBridge.emit('grid:update', { grid: GRID_5x5, comboLevel: 0, fireRoundActive: false });

    // Build a 5-letter diagonal path: A(0,0)→G(1,1)→M(2,2)→S(3,3)→Y(4,4)
    selectPath(scene, [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]);

    // Camera shake should be triggered for the momentum vibration
    expect(scene.cameras.main.shake).toHaveBeenCalled();
  });

  it('clears momentum effects on pointer up', () => {
    const scene = createScene();
    GameBridge.emit('grid:update', { grid: GRID_5x5, comboLevel: 0, fireRoundActive: false });

    // Build 5-letter path to start vibration
    selectPath(scene, [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]);

    // Clear the mock to track what happens on pointer up
    (scene.cameras.main.shake as jest.Mock).mockClear();

    const pointerUp = getInputHandler(scene, 'pointerup');
    pointerUp.call(scene);

    // After pointer up, no new shake should start
    // (the stop is implicit — no continuous shake in the next frame)
    // The key assertion: momentum state is cleared
    // We verify indirectly — building a new 3-letter path should NOT trigger shake
    const pointerDown = getInputHandler(scene, 'pointerdown');
    const pointerMove = getInputHandler(scene, 'pointermove');

    // Re-emit grid to get fresh tiles
    GameBridge.emit('grid:update', { grid: GRID_5x5, comboLevel: 0, fireRoundActive: false });
    (scene.cameras.main.shake as jest.Mock).mockClear();

    const pos00 = getTilePosition(scene, 0, 0);
    pointerDown.call(scene, { x: pos00.x, y: pos00.y });
    const pos01 = getTilePosition(scene, 0, 1);
    pointerMove.call(scene, { x: pos01.x, y: pos01.y });
    const pos02 = getTilePosition(scene, 0, 2);
    pointerMove.call(scene, { x: pos02.x, y: pos02.y });

    // 3-letter path — should NOT shake
    expect(scene.cameras.main.shake).not.toHaveBeenCalled();
  });

  it('does not start vibration when reduceMotion is true', () => {
    const scene = createScene();
    GameBridge.emit('accessibility:update', {
      reduceMotion: true,
      disableFireRoundLights: false,
      disableEarthquakeEffects: false,
      isLowEnd: false,
      isRTL: false,
    });
    GameBridge.emit('grid:update', { grid: GRID_5x5, comboLevel: 0, fireRoundActive: false });

    (scene.cameras.main.shake as jest.Mock).mockClear();

    selectPath(scene, [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]);

    // No camera shake when reduceMotion
    expect(scene.cameras.main.shake).not.toHaveBeenCalled();
  });
});
