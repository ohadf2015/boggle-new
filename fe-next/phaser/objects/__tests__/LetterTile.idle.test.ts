/**
 * LetterTile idle breathing animation tests (adventure mode).
 *
 * Covers:
 *  - Breathing tween config (scale 1.0→1.03, staggered duration)
 *  - Pause on select / resume on deselect
 *  - reduceMotion: no tweens
 *  - Cleanup via stopIdleAnimations
 */

import Phaser from 'phaser';
import { LetterTile } from '../LetterTile';
import { getComboHexColors } from '@/lib/phaser/logic/ComboTracker';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

const COMBO = getComboHexColors(0);

// ─── Breathing animation ─────────────────────────────────────────────────────

describe('LetterTile idle breathing', () => {
  it('starts a breathing tween via startIdleAnimations', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.startIdleAnimations({ reduceMotion: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const breathingCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.scaleX !== undefined && call[0]?.repeat === -1
    );
    expect(breathingCall).toBeDefined();
  });

  it('uses scale range 1.0 to 1.03', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.startIdleAnimations({ reduceMotion: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const breathingCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.scaleX !== undefined && call[0]?.repeat === -1
    );
    const config = breathingCall![0];
    expect(config.scaleX.from).toBe(1);
    expect(config.scaleX.to).toBe(1.03);
    expect(config.scaleY.from).toBe(1);
    expect(config.scaleY.to).toBe(1.03);
  });

  it('randomises duration between 1200 and 1800ms', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.startIdleAnimations({ reduceMotion: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const breathingCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.scaleX !== undefined && call[0]?.repeat === -1
    );
    const duration = breathingCall![0].duration;
    expect(duration).toBeGreaterThanOrEqual(1200);
    expect(duration).toBeLessThanOrEqual(1800);
  });

  it('uses yoyo + Sine.easeInOut', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.startIdleAnimations({ reduceMotion: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const breathingCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.scaleX !== undefined && call[0]?.repeat === -1
    );
    const config = breathingCall![0];
    expect(config.ease).toBe('Sine.easeInOut');
    expect(config.yoyo).toBe(true);
  });
});

// ─── reduceMotion ────────────────────────────────────────────────────────────

describe('LetterTile reduceMotion', () => {
  it('does NOT create breathing tween when reduceMotion is true', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.startIdleAnimations({ reduceMotion: true });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const breathingCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.scaleX !== undefined && call[0]?.repeat === -1
    );
    expect(breathingCall).toBeUndefined();
  });
});

// ─── Pause / Resume ──────────────────────────────────────────────────────────

describe('LetterTile idle pause/resume', () => {
  it('pauses idle tweens when selected', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.startIdleAnimations({ reduceMotion: false });

    tile.select(0, COMBO);

    const killTweensOf = scene.tweens.killTweensOf as jest.Mock;
    expect(killTweensOf).toHaveBeenCalledWith(tile);
  });

  it('resumes idle tweens when deselected', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.startIdleAnimations({ reduceMotion: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const callsBefore = tweenAdd.mock.calls.length;

    tile.select(0, COMBO);
    tile.deselect();

    const callsAfter = tweenAdd.mock.calls.length;
    expect(callsAfter).toBeGreaterThan(callsBefore);
  });
});

// ─── Cleanup ─────────────────────────────────────────────────────────────────

describe('LetterTile idle cleanup', () => {
  it('stopIdleAnimations kills tweens', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.startIdleAnimations({ reduceMotion: false });
    tile.stopIdleAnimations();

    const killTweensOf = scene.tweens.killTweensOf as jest.Mock;
    expect(killTweensOf).toHaveBeenCalledWith(tile);
  });
});
