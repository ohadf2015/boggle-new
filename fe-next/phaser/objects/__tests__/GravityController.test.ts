/**
 * GravityController — Phaser tween orchestrator for blast mode gravity.
 *
 * Verifies:
 * - playGravitySequence creates tweens for falling tiles
 * - Creates tweens for new tiles spawning from above
 * - Returns a Promise that resolves
 * - Respects reduceMotion (instant repositioning)
 *
 * RED phase: tests fail until implementation exists.
 */

import Phaser from 'phaser';
import { GravityController } from '../GravityController';
import type { BlastTile } from '../BlastTile';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

/** Create a mock BlastTile-like object with position properties */
function mockTile(row: number, col: number): BlastTile {
  return {
    x: col * 60,
    y: row * 60,
    setPosition: jest.fn(),
    setScale: jest.fn(),
    setAlpha: jest.fn(),
  } as unknown as BlastTile;
}

const TILE_SIZE = 60;

// ─── playGravitySequence ──────────────────────────────────────────────────────

describe('GravityController.playGravitySequence', () => {
  it('creates tweens for falling tiles', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tileMap = new Map<string, BlastTile>();
    const tile = mockTile(2, 0);
    tileMap.set('2,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 2, fallDistance: 2 }];

    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('creates tweens for new tiles spawning from above', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tileMap = new Map<string, BlastTile>();
    const tile = mockTile(0, 1);
    tileMap.set('0,1', tile);

    const newTiles = [{ row: 0, col: 1, letter: 'X', type: 'standard' }];

    controller.playGravitySequence(scene, [], newTiles, tileMap, TILE_SIZE);

    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('returns a Promise', () => {
    const scene = makeScene();
    const controller = new GravityController();
    const tileMap = new Map<string, BlastTile>();

    const result = controller.playGravitySequence(scene, [], [], tileMap, TILE_SIZE);

    expect(result).toBeInstanceOf(Promise);
  });

  it('resolves immediately when no tiles to animate', async () => {
    const scene = makeScene();
    const controller = new GravityController();
    const tileMap = new Map<string, BlastTile>();

    // Should resolve without hanging
    await controller.playGravitySequence(scene, [], [], tileMap, TILE_SIZE);
  });
});

// ─── reduceMotion ─────────────────────────────────────────────────────────────

describe('GravityController reduceMotion', () => {
  it('does not create tweens when reduceMotion is true', () => {
    const scene = makeScene();
    const controller = new GravityController({ reduceMotion: true });

    const tileMap = new Map<string, BlastTile>();
    const tile = mockTile(2, 0);
    tileMap.set('2,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 2, fallDistance: 2 }];

    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    expect(scene.tweens.add).not.toHaveBeenCalled();
  });

  it('directly repositions tiles when reduceMotion is true', () => {
    const scene = makeScene();
    const controller = new GravityController({ reduceMotion: true });

    const tile = mockTile(2, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('2,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 2, fallDistance: 2 }];

    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    // Tile should be repositioned directly
    expect(tile.setPosition).toHaveBeenCalled();
  });
});
