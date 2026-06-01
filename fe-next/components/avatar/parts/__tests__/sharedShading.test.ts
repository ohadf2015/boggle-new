import { describe, it, expect } from 'vitest';
import {
  eyeRimArc,
  lipShine,
  RIM_OPACITY,
  RIM_STROKE,
  SHINE_OPACITY,
  SHINE_STROKE,
} from '@/components/avatar/parts/sharedShading';

describe('sharedShading — pure geometry builders', () => {
  describe('eyeRimArc', () => {
    it('returns a quadratic arc path string', () => {
      const d = eyeRimArc(38, 42, 6.5);
      expect(d).toMatch(/^M/);
      expect(d).toContain('Q');
    });

    it('spans symmetrically across the eye centre', () => {
      const cx = 38;
      const d = eyeRimArc(cx, 42, 6.5);
      // M x1 y ... Q cx yc ... x2 y
      const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
      const x1 = nums[0];
      const x2 = nums[4];
      expect(x1).toBeLessThan(cx);
      expect(x2).toBeGreaterThan(cx);
      // symmetric about cx
      expect(cx - x1).toBeCloseTo(x2 - cx, 1);
    });

    it('bulges upward (control y is above the endpoints)', () => {
      const cy = 42;
      const d = eyeRimArc(38, cy, 6.5);
      const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
      const yEdge = nums[1];
      const yCtrl = nums[3];
      // smaller y = higher on screen; the rim sits on the upper edge
      expect(yCtrl).toBeLessThan(yEdge);
      expect(yEdge).toBeLessThan(cy);
    });

    it('scales with radius (bigger eye → wider arc)', () => {
      const small = eyeRimArc(38, 42, 5).match(/-?\d+(\.\d+)?/g)!.map(Number);
      const big = eyeRimArc(38, 42, 9).match(/-?\d+(\.\d+)?/g)!.map(Number);
      const smallWidth = small[4] - small[0];
      const bigWidth = big[4] - big[0];
      expect(bigWidth).toBeGreaterThan(smallWidth);
    });
  });

  describe('lipShine', () => {
    it('returns a quadratic arc above the mouth line', () => {
      const d = lipShine(50, 60, 12);
      expect(d).toMatch(/^M/);
      expect(d).toContain('Q');
      const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
      expect(nums[0]).toBeLessThan(50); // starts left of centre
      expect(nums[4]).toBeGreaterThan(50); // ends right of centre
    });
  });

  describe('style constants', () => {
    it('keep specular subtle (low opacity, thin stroke)', () => {
      expect(RIM_OPACITY).toBeGreaterThan(0);
      expect(RIM_OPACITY).toBeLessThanOrEqual(0.35);
      expect(SHINE_OPACITY).toBeGreaterThan(0);
      expect(SHINE_OPACITY).toBeLessThanOrEqual(0.5);
      expect(RIM_STROKE).toBeLessThanOrEqual(1.5);
      expect(SHINE_STROKE).toBeLessThanOrEqual(1.5);
    });
  });
});
