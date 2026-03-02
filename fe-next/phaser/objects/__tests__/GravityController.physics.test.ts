/**
 * GravityController — Candy Crush-style gravity physics.
 *
 * Verifies:
 * - Fall durations per distance (non-linear: 180/280/350/400/430ms)
 * - Cubic.easeIn for acceleration feel
 * - Elastic landing bounce: scaleY squash, scaleX stretch, Y overshoot
 * - Column stagger: 30ms per column, leftmost first
 * - Compression wave: tiles below heavy landing briefly squash
 * - Grid settle: entire grid micro-bounces after all falls complete
 * - New tile entry from y = -tileSize
 * - Motion stretch during fall: scaleY 1.05, scaleX 0.97
 * - Landing flash: 30ms white bg flash on impact
 * - blast:anim:complete timing: not emitted until grid settle done
 */

import Phaser from 'phaser';
import { GravityController } from '../GravityController';
import type { BlastTile } from '../BlastTile';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

function mockTile(row: number, col: number, tileSize = 60): BlastTile {
  return {
    x: col * tileSize,
    y: row * tileSize,
    setPosition: jest.fn(),
    setScale: jest.fn(),
    setAlpha: jest.fn(),
    setAngle: jest.fn(),
    setTint: jest.fn(),
    clearTint: jest.fn(),
    angle: 0,
    scaleX: 1,
    scaleY: 1,
  } as unknown as BlastTile;
}

const TILE_SIZE = 60;

// ─── Fall duration per distance ─────────────────────────────────────────────

describe('GravityController Candy Crush fall durations', () => {
  it('1-row fall uses ~180ms duration', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(3, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('3,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 3, fallDistance: 1 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    // Find the fall tween (has y property)
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];
    expect(fallTween).toBeDefined();
    expect(fallTween.duration).toBe(180);
  });

  it('2-row fall uses ~280ms duration', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(2, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('2,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 2, fallDistance: 2 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];
    expect(fallTween.duration).toBe(280);
  });

  it('3-row fall uses ~350ms duration', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(1, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('1,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 1, fallDistance: 3 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];
    expect(fallTween.duration).toBe(350);
  });

  it('4-row fall uses ~400ms duration', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(0, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('0,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 0, fallDistance: 4 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];
    expect(fallTween.duration).toBe(400);
  });

  it('5+ row fall uses ~430ms duration', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(0, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('0,0', tile);

    const fallingTiles = [{ row: 5, col: 0, fromRow: 0, fallDistance: 5 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];
    expect(fallTween.duration).toBe(430);
  });

  it('uses Cubic.easeIn easing for acceleration feel', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(2, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('2,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 2, fallDistance: 2 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];
    expect(fallTween.ease).toBe('Cubic.easeIn');
  });
});

// ─── Elastic landing bounce ─────────────────────────────────────────────────

describe('GravityController elastic landing bounce', () => {
  it('1-row fall: scaleY squash to 0.88', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(3, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('3,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 3, fallDistance: 1 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    // Trigger fall tween onComplete
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];
    fallTween.onComplete?.();

    // Find bounce tween: has scaleY as object (with from/to), NOT a plain number
    const bounceTween = tweenCalls.find(
      (c: unknown[]) => {
        const t = c[0] as Record<string, unknown>;
        return typeof t.scaleY === 'object' && t.ease === 'Elastic.easeOut';
      }
    )?.[0];
    expect(bounceTween).toBeDefined();
    expect(bounceTween.scaleY.from).toBeCloseTo(0.88, 2);
  });

  it('2-row fall: scaleY squash to 0.82', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(2, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('2,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 2, fallDistance: 2 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];
    fallTween.onComplete?.();

    const bounceTween = tweenCalls.find(
      (c: unknown[]) => {
        const t = c[0] as Record<string, unknown>;
        return typeof t.scaleY === 'object' && t.ease === 'Elastic.easeOut';
      }
    )?.[0];
    expect(bounceTween.scaleY.from).toBeCloseTo(0.82, 2);
  });

  it('3+ row fall: scaleY squash to 0.75', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(0, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('0,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 0, fallDistance: 4 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];
    fallTween.onComplete?.();

    const bounceTween = tweenCalls.find(
      (c: unknown[]) => {
        const t = c[0] as Record<string, unknown>;
        return typeof t.scaleY === 'object' && t.ease === 'Elastic.easeOut';
      }
    )?.[0];
    expect(bounceTween.scaleY.from).toBeCloseTo(0.75, 2);
  });

  it('scaleX stretches as inverse of scaleY (volume conservation)', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(3, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('3,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 3, fallDistance: 1 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];
    fallTween.onComplete?.();

    const bounceTween = tweenCalls.find(
      (c: unknown[]) => {
        const t = c[0] as Record<string, unknown>;
        return typeof t.scaleY === 'object' && t.ease === 'Elastic.easeOut';
      }
    )?.[0];
    // scaleX.from should be 1/scaleY.from (conservation of volume)
    const expectedScaleX = 1 / bounceTween.scaleY.from;
    expect(bounceTween.scaleX.from).toBeCloseTo(expectedScaleX, 2);
  });

  it('bounce uses Elastic.easeOut easing', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(3, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('3,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 3, fallDistance: 1 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];
    fallTween.onComplete?.();

    const bounceTween = tweenCalls.find(
      (c: unknown[]) => {
        const t = c[0] as Record<string, unknown>;
        return typeof t.scaleY === 'object' && t.ease === 'Elastic.easeOut';
      }
    )?.[0];
    expect(bounceTween).toBeDefined();
    expect(bounceTween.ease).toBe('Elastic.easeOut');
  });

  it('bounce duration is 350ms', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(3, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('3,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 3, fallDistance: 1 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];
    fallTween.onComplete?.();

    const bounceTween = tweenCalls.find(
      (c: unknown[]) => {
        const t = c[0] as Record<string, unknown>;
        return typeof t.scaleY === 'object' && t.ease === 'Elastic.easeOut';
      }
    )?.[0];
    expect(bounceTween.duration).toBe(350);
  });
});

// ─── Column stagger ────────────────────────────────────────────────────────

describe('GravityController column stagger', () => {
  it('tiles in different columns have staggered delays (30ms per column)', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tileMap = new Map<string, BlastTile>();
    const fallingTiles = [];

    for (let col = 0; col < 4; col++) {
      const tile = mockTile(2, col);
      tileMap.set(`2,${col}`, tile);
      fallingTiles.push({ row: 4, col, fromRow: 2, fallDistance: 2 });
    }

    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    // Find fall tweens (have y property)
    const fallTweens = tweenCalls
      .map((c: unknown[]) => c[0] as Record<string, unknown>)
      .filter((t) => t.y !== undefined);

    expect(fallTweens.length).toBe(4);

    // Each column should have a 30ms larger delay than the previous
    const delays = fallTweens.map((t) => (t.delay as number) ?? 0);
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i] - delays[i - 1]).toBe(30);
    }
  });

  it('RTL locale reverses column stagger order (rightmost first)', () => {
    const scene = makeScene();
    const controller = new GravityController({ isRTL: true });

    const tileMap = new Map<string, BlastTile>();
    const fallingTiles = [];
    const gridCols = 4;

    for (let col = 0; col < gridCols; col++) {
      const tile = mockTile(2, col);
      tileMap.set(`2,${col}`, tile);
      fallingTiles.push({ row: 4, col, fromRow: 2, fallDistance: 2 });
    }

    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const fallTweens = tweenCalls
      .map((c: unknown[]) => c[0] as Record<string, unknown>)
      .filter((t) => t.y !== undefined);

    // Rightmost column (col 3) should have delay 0, leftmost (col 0) should have delay 90
    const delays = fallTweens.map((t) => (t.delay as number) ?? 0);
    // Col 3 → 0ms, Col 2 → 30ms, Col 1 → 60ms, Col 0 → 90ms
    expect(delays[3]).toBeLessThan(delays[0]);
  });
});

// ─── Compression wave ──────────────────────────────────────────────────────

describe('GravityController compression wave', () => {
  it('tiles below heavy landing (3+ rows) briefly squash to scaleY 0.95', () => {
    const scene = makeScene();
    const controller = new GravityController();

    // Tile at row 4 (target), tile at row 5 (below)
    const fallingTile = mockTile(1, 0);
    const belowTile = mockTile(5, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('1,0', fallingTile);
    tileMap.set('5,0', belowTile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 1, fallDistance: 3 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    // Trigger fall onComplete
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];
    fallTween.onComplete?.();

    // Find compression wave tween targeting belowTile
    const compressionTween = tweenCalls.find(
      (c: unknown[]) => {
        const t = c[0] as Record<string, unknown>;
        return t.targets === belowTile && typeof t.scaleY === 'object';
      }
    )?.[0];

    expect(compressionTween).toBeDefined();
    expect((compressionTween.scaleY as { from: number }).from).toBeCloseTo(0.95, 2);
    expect(compressionTween.duration).toBe(80);
  });
});

// ─── Grid settle ────────────────────────────────────────────────────────────

describe('GravityController grid settle', () => {
  it('after all falls complete, creates a grid micro-bounce tween', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(3, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('3,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 3, fallDistance: 1 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    // Trigger fall onComplete
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];
    fallTween.onComplete?.();

    // Trigger bounce onComplete
    const bounceTween = tweenCalls.find(
      (c: unknown[]) => {
        const t = c[0] as Record<string, unknown>;
        return t.scaleY !== undefined && t.ease === 'Elastic.easeOut';
      }
    )?.[0];
    bounceTween?.onComplete?.();

    // Find grid settle tween: scaleY from 0.98 to 1.0, duration 100ms
    const allTweens = tweenCalls.map((c: unknown[]) => c[0] as Record<string, unknown>);
    const settleTween = allTweens.find(
      (t) => t.duration === 100 && typeof t.scaleY === 'object' &&
        (t.scaleY as { from: number }).from === 0.98
    );
    expect(settleTween).toBeDefined();
  });
});

// ─── New tiles from above ─────────────────────────────────────────────────

describe('GravityController new tile entry', () => {
  it('new tiles spawn at y = -tileSize (off-screen)', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(0, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('0,0', tile);

    const newTiles = [{ row: 0, col: 0, letter: 'A', type: 'standard' }];
    controller.playGravitySequence(scene, [], newTiles, tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const newTileTween = tweenCalls.find(
      (c: unknown[]) => {
        const t = c[0] as Record<string, unknown>;
        return typeof t.y === 'object' && (t.y as { from: number }).from < 0;
      }
    )?.[0];
    expect(newTileTween).toBeDefined();
    expect((newTileTween.y as { from: number }).from).toBe(tile.y - TILE_SIZE);
  });

  it('new tiles fall with same Candy Crush physics (Cubic.easeIn + bounce)', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(0, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('0,0', tile);

    const newTiles = [{ row: 0, col: 0, letter: 'A', type: 'standard' }];
    controller.playGravitySequence(scene, [], newTiles, tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const newTileTween = tweenCalls.find(
      (c: unknown[]) => {
        const t = c[0] as Record<string, unknown>;
        return typeof t.y === 'object' && (t.y as { from: number }).from < 0;
      }
    )?.[0];
    expect(newTileTween.ease).toBe('Cubic.easeIn');
  });
});

// ─── Motion stretch during fall ────────────────────────────────────────────

describe('GravityController motion stretch', () => {
  it('sets scaleY to 1.05 and scaleX to 0.97 during fall', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(2, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('2,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 2, fallDistance: 2 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];

    // Fall tween should include motion stretch via scaleY/scaleX on the tile
    // or via onStart callback
    expect(fallTween.scaleY).toBeDefined();
    expect(fallTween.scaleY).toBe(1.05);
    expect(fallTween.scaleX).toBe(0.97);
  });
});

// ─── Landing flash ─────────────────────────────────────────────────────────

describe('GravityController landing flash', () => {
  it('sets tile tint to white (0xffffff) on landing', () => {
    const scene = makeScene();
    const controller = new GravityController();

    const tile = mockTile(3, 0);
    const tileMap = new Map<string, BlastTile>();
    tileMap.set('3,0', tile);

    const fallingTiles = [{ row: 4, col: 0, fromRow: 3, fallDistance: 1 }];
    controller.playGravitySequence(scene, fallingTiles, [], tileMap, TILE_SIZE);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const fallTween = tweenCalls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).y !== undefined
    )?.[0];
    fallTween.onComplete?.();

    // Tile should have setTint called with white
    expect(tile.setTint).toHaveBeenCalledWith(0xffffff);
  });
});
