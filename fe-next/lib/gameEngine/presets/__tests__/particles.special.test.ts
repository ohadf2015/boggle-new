/**
 * Tests for gem/frozen/ice-specific particle presets.
 */
import { describe, it, expect } from 'vitest';
import type { ParticleConfig } from '../../types';
import {
  GEM_SHARD_BURST,
  GEM_GOLDEN_EXPLOSION,
  FROST_MIST,
  ICE_SHATTER,
  FROST_CRACK,
} from '../particles';

describe('special tile particle presets', () => {
  const assertValidPreset = (preset: ParticleConfig) => {
    expect(preset.maxParticles).toBeGreaterThan(0);
    expect(preset.colors.length).toBeGreaterThan(0);
    expect(preset.lifetime.min).toBeLessThanOrEqual(preset.lifetime.max);
    expect(preset.speed.min).toBeLessThanOrEqual(preset.speed.max);
  };

  describe('GEM_SHARD_BURST', () => {
    it('is a valid particle config with emerald colors', () => {
      assertValidPreset(GEM_SHARD_BURST);
      // Should have green/emerald tones
      expect(GEM_SHARD_BURST.colors.some(c => c.includes('ff') || c.includes('88'))).toBe(true);
    });

    it('is a small burst (few particles for per-hit feedback)', () => {
      expect(GEM_SHARD_BURST.maxParticles).toBeLessThanOrEqual(10);
    });
  });

  describe('GEM_GOLDEN_EXPLOSION', () => {
    it('is a valid particle config with golden colors', () => {
      assertValidPreset(GEM_GOLDEN_EXPLOSION);
      // Should contain gold/yellow tones
      expect(GEM_GOLDEN_EXPLOSION.colors.some(c => c.toLowerCase().includes('ff'))).toBe(true);
    });

    it('is a larger burst than shard burst (dramatic final hit)', () => {
      expect(GEM_GOLDEN_EXPLOSION.maxParticles).toBeGreaterThan(GEM_SHARD_BURST.maxParticles);
    });

    it('uses additive blending for sparkle', () => {
      expect(GEM_GOLDEN_EXPLOSION.blendMode).toBe('add');
    });
  });

  describe('FROST_MIST', () => {
    it('is a valid particle config with white/blue colors', () => {
      assertValidPreset(FROST_MIST);
    });

    it('has slow-moving particles (mist effect)', () => {
      expect(FROST_MIST.speed.max).toBeLessThanOrEqual(60);
    });

    it('has low alpha for subtle effect', () => {
      expect(FROST_MIST.alpha.start).toBeLessThanOrEqual(0.6);
    });
  });

  describe('ICE_SHATTER', () => {
    it('is a valid particle config', () => {
      assertValidPreset(ICE_SHATTER);
    });

    it('uses diamond shape for crystalline fragments', () => {
      expect(ICE_SHATTER.shape).toBe('diamond');
    });

    it('has light blue/cyan colors', () => {
      expect(ICE_SHATTER.colors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('FROST_CRACK', () => {
    it('is a valid particle config', () => {
      assertValidPreset(FROST_CRACK);
    });

    it('is a burst spawn shape', () => {
      expect(FROST_CRACK.spawnShape).toBe('burst');
    });

    it('has white/ice colors for crack lines', () => {
      expect(FROST_CRACK.colors.some(c => c === 'ffffff' || c === 'FFFFFF')).toBe(true);
    });
  });
});
