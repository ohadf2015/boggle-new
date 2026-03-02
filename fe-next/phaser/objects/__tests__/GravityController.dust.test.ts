/**
 * GravityController — dust particles and landing impacts (updated for Candy Crush physics).
 *
 * Verifies:
 * - Short falls (1 row): bounce scaleY 0.88, no dust
 * - Medium falls (3-4 rows): bounce scaleY 0.75, dust cloud
 * - Heavy falls (5+ rows): bounce scaleY 0.75, big dust cloud
 * - Camera micro-shake when 3+ tiles land simultaneously
 * - Dust particles use BlastParticleManager.playLandingDust
 * - Reduce motion skips all effects
 */

import Phaser from 'phaser';
import { GravityController } from '../GravityController';
import type { BlastTile } from '../BlastTile';
import { BlastParticleManager } from '../BlastParticleManager';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

function mockTile(row: number, col: number): BlastTile {
  return {
    x: col * 60,
    y: row * 60,
    setPosition: jest.fn(),
    setScale: jest.fn(),
    setAlpha: jest.fn(),
    setAngle: jest.fn(),
    setTint: jest.fn(),
    clearTint: jest.fn(),
    angle: 0,
  } as unknown as BlastTile;
}

const TILE_SIZE = 60;

/** Find the bounce tween (Elastic.easeOut with scaleY object) from tween calls */
function findBounceTween(tweenCalls: unknown[][]): Record<string, unknown> | undefined {
  return tweenCalls
    .map((c) => c[0] as Record<string, unknown>)
    .find((t) => typeof t.scaleY === 'object' && t.ease === 'Elastic.easeOut');
}

// ─── Landing impact scaling ──────────────────────────────────────────────────

describe('GravityController heavier landings', () => {
  it('uses scaleY 0.88 for short falls (1 row)', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(2, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('2,0', tile);

    const fallingTiles = [{ row: 3, col: 0, fromRow: 2, fallDistance: 1 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    // Trigger fall onComplete
    const fallTween = tweenCalls[0][0];
    fallTween.onComplete?.();

    const bounceTween = findBounceTween(tweenCalls);
    expect(bounceTween).toBeDefined();
    expect((bounceTween!.scaleY as { from: number }).from).toBeCloseTo(0.88, 1);
  });

  it('uses scaleY 0.75 for medium falls (3-4 rows)', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(0, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('0,0', tile);

    const fallingTiles = [{ row: 3, col: 0, fromRow: 0, fallDistance: 3 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    tweenCalls[0][0].onComplete?.();

    const bounceTween = findBounceTween(tweenCalls);
    expect(bounceTween).toBeDefined();
    expect((bounceTween!.scaleY as { from: number }).from).toBeCloseTo(0.75, 1);
  });

  it('uses scaleY 0.75 for heavy falls (5+ rows)', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(0, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('0,0', tile);

    const fallingTiles = [{ row: 5, col: 0, fromRow: 0, fallDistance: 5 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    tweenCalls[0][0].onComplete?.();

    const bounceTween = findBounceTween(tweenCalls);
    expect(bounceTween).toBeDefined();
    expect((bounceTween!.scaleY as { from: number }).from).toBeCloseTo(0.75, 1);
  });
});

// ─── Dust particles ─────────────────────────────────────────────────────────

describe('GravityController dust particles', () => {
  it('calls playLandingDust for medium falls (3-4 rows)', () => {
    const scene = makeScene();
    const particles = new BlastParticleManager();
    const dustSpy = jest.spyOn(particles, 'playLandingDust');

    const controller = new GravityController({ particleManager: particles });

    const tile = mockTile(0, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('0,0', tile);

    const fallingTiles = [{ row: 3, col: 0, fromRow: 0, fallDistance: 3 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    tweenCalls[0][0].onComplete?.();

    expect(dustSpy).toHaveBeenCalledWith(
      scene,
      tile.x,
      tile.y,
      3,
      expect.objectContaining({ reduceMotion: false }),
    );
  });

  it('does NOT call playLandingDust for short falls (1-2 rows)', () => {
    const scene = makeScene();
    const particles = new BlastParticleManager();
    const dustSpy = jest.spyOn(particles, 'playLandingDust');

    const controller = new GravityController({ particleManager: particles });

    const tile = mockTile(2, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('2,0', tile);

    const fallingTiles = [{ row: 3, col: 0, fromRow: 2, fallDistance: 1 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    tweenCalls[0][0].onComplete?.();

    expect(dustSpy).not.toHaveBeenCalled();
  });

  it('calls playLandingDust with big particle count for heavy falls (5+ rows)', () => {
    const scene = makeScene();
    const particles = new BlastParticleManager();
    const dustSpy = jest.spyOn(particles, 'playLandingDust');

    const controller = new GravityController({ particleManager: particles });

    const tile = mockTile(0, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('0,0', tile);

    const fallingTiles = [{ row: 5, col: 0, fromRow: 0, fallDistance: 5 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    tweenCalls[0][0].onComplete?.();

    expect(dustSpy).toHaveBeenCalledWith(
      scene,
      tile.x,
      tile.y,
      5,
      expect.objectContaining({ reduceMotion: false }),
    );
  });
});

// ─── Camera micro-shake on simultaneous landings ────────────────────────────

describe('GravityController camera micro-shake', () => {
  it('triggers camera shake when 3+ tiles land simultaneously', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tileMap = new Map<string, BlastTile>();
    const fallingTiles = [];
    for (let col = 0; col < 4; col++) {
      const tile = mockTile(0, col);
      tileMap.set(`0,${col}`, tile);
      fallingTiles.push({ row: 3, col, fromRow: 0, fallDistance: 3 });
    }

    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    // Trigger all fall onCompletes
    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    for (const call of tweenCalls) {
      call[0].onComplete?.();
    }

    expect(scene.cameras.main.shake).toHaveBeenCalledWith(100, 0.003);
  });

  it('does NOT trigger camera shake with fewer than 3 simultaneous landings', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tileMap = new Map<string, BlastTile>();
    const fallingTiles = [];
    for (let col = 0; col < 2; col++) {
      const tile = mockTile(0, col);
      tileMap.set(`0,${col}`, tile);
      fallingTiles.push({ row: 3, col, fromRow: 0, fallDistance: 3 });
    }

    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    for (const call of tweenCalls) {
      call[0].onComplete?.();
    }

    expect(scene.cameras.main.shake).not.toHaveBeenCalled();
  });
});

// ─── Reduce motion ──────────────────────────────────────────────────────────

describe('GravityController dust + effects with reduceMotion', () => {
  it('skips dust and all effects when reduceMotion is true', () => {
    const scene = makeScene();
    const particles = new BlastParticleManager();
    const dustSpy = jest.spyOn(particles, 'playLandingDust');

    const controller = new GravityController({
      reduceMotion: true,
      particleManager: particles,
    });

    const tile = mockTile(0, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('0,0', tile);

    const fallingTiles = [{ row: 5, col: 0, fromRow: 0, fallDistance: 5 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    // reduceMotion -> no tweens, no dust
    expect(scene.tweens.add).not.toHaveBeenCalled();
    expect(dustSpy).not.toHaveBeenCalled();
  });
});
