import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Contract: nothing on the daily Word Wheel rotates. The wheel stays steady and
 * celebrates with scale, glow and bursts instead — the owner asked for no spin,
 * and every twirl that survived the first pass (sparks, Pixi particles, the
 * rejected-word wobble, the submit spinner, the passed-player toast) read as
 * "the wheel is spinning again".
 *
 * jsdom does not run framer-motion keyframes, so this is a source contract.
 */

const FILES = [
  'components/daily/wheel/WheelDisc.tsx',
  'components/daily/wheel/WheelDiscLetter.tsx',
  'components/daily/wheel/WheelWordFx.tsx',
  'components/daily/wheel/WheelTrail.tsx',
  'components/daily/WordWheelGame.tsx',
  'components/daily/WordWheelWordLine.tsx',
  'components/daily/WordWheelEffectsCanvas.tsx',
  'components/daily/WordWheelPixiRing.tsx',
  'styles/word-wheel-motion.css',
];

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

describe('daily Word Wheel stays steady', () => {
  it.each(FILES)('Given %s, When scanned, Then it animates no rotation', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/\brotate:\s*[[\d-]/);
    expect(src).not.toMatch(/animate-spin|animate-\[spin|\bspin_\d/);
    expect(src).not.toMatch(/@keyframes[^{]*\{[^}]*rotate/);
  });

  it('Given the Pixi burst configs, When scanned, Then no particle spins', () => {
    const src = read('components/daily/WordWheelEffectsCanvas.tsx');
    const speeds = [...src.matchAll(/rotationSpeed:\s*\{\s*min:\s*(-?\d+),\s*max:\s*(-?\d+)/g)];
    for (const [, min, max] of speeds) {
      expect(Number(min)).toBe(0);
      expect(Number(max)).toBe(0);
    }
  });

  it('Given the multiplayer ring, When scanned, Then its orbit dots do not travel around the wheel', () => {
    const src = read('components/daily/WordWheelPixiRing.tsx');
    expect(src).not.toMatch(/const a = -?angle/);
  });
});
