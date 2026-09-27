/**
 * Magnet/Vortex tile effect tests — TDD for enhanced magnet visuals.
 * Covers: spiral particle preset, explosion preset, CSS pull/explosion phases,
 * magnet-specific EffectsCanvas behavior.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastTile } from '../BlastTile';
import {
  VORTEX_PULL,
  VORTEX_EXPLOSION,
} from '@/lib/gameEngine/presets/particles';

// Mock reduced motion
jest.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

const baseProps = {
  letter: 'A',
  type: 'magnet' as const,
  phase: 'idle' as const,
  isSelected: false,
  isCleared: false,
  onClick: jest.fn(),
};

describe('Magnet/Vortex Effect', () => {
  describe('VORTEX_PULL particle preset', () => {
    it('uses purple/violet colors for spiral effect', () => {
      const hasViolet = VORTEX_PULL.colors.some(c => {
        const r = parseInt(c.slice(0, 2), 16);
        const b = parseInt(c.slice(4, 6), 16);
        return b > 150 && r > 80;
      });
      expect(hasViolet).toBe(true);
    });

    it('spawns from a circle (spiral inward)', () => {
      expect(VORTEX_PULL.spawnShape).toBe('circle');
      expect(VORTEX_PULL.spawnConfig?.radius).toBeGreaterThan(0);
    });

    it('uses additive blending', () => {
      expect(VORTEX_PULL.blendMode).toBe('add');
    });

    it('particles shrink to zero (converging inward)', () => {
      expect(VORTEX_PULL.scale.end).toBe(0);
    });

    it('has rotation for spiral motion', () => {
      expect(VORTEX_PULL.rotationSpeed).toBeDefined();
      expect(VORTEX_PULL.rotationSpeed!.max).toBeGreaterThan(200);
    });
  });

  describe('VORTEX_EXPLOSION particle preset', () => {
    it('exists as a separate preset for the explosion phase', () => {
      expect(VORTEX_EXPLOSION).toBeDefined();
    });

    it('has higher speed than VORTEX_PULL (radial burst outward)', () => {
      expect(VORTEX_EXPLOSION.speed.max).toBeGreaterThan(VORTEX_PULL.speed.max);
    });

    it('uses burst spawn shape', () => {
      expect(VORTEX_EXPLOSION.spawnShape).toBe('burst');
    });

    it('uses purple/white colors matching magnet theme', () => {
      expect(VORTEX_EXPLOSION.colors).toEqual(
        expect.arrayContaining(['ffffff'])
      );
    });

    it('uses additive blending', () => {
      expect(VORTEX_EXPLOSION.blendMode).toBe('add');
    });

    it('has more particles than pull phase', () => {
      expect(VORTEX_EXPLOSION.maxParticles).toBeGreaterThanOrEqual(VORTEX_PULL.maxParticles);
    });
  });

  describe('BlastTile magnet clearing CSS', () => {
    it('magnet clearing has implode transform (shrink + spin)', () => {
      const { container } = render(
        <BlastTile {...baseProps} phase="clearing" />
      );
      const button = container.querySelector('button');
      expect(button?.style.transform).toContain('scale(0.05)');
      expect(button?.style.transform).toContain('rotate(1080deg)');
    });

    it('magnet anticipation phase applies brightness filter', () => {
      const { container } = render(
        <BlastTile {...baseProps} phase="anticipation" />
      );
      const button = container.querySelector('button');
      expect(button?.style.filter).toContain('brightness');
    });

    it('magnet idle renders blast-tile-magnet class', () => {
      render(<BlastTile {...baseProps} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-tile-magnet');
    });

    it('magnet clearing uses violet tonal styling', () => {
      const { container } = render(
        <BlastTile {...baseProps} phase="clearing" />
      );
      const button = container.querySelector('button');
      const styleAttr = button?.getAttribute('style') ?? '';
      expect(styleAttr).toContain('#D8A0E8');
    });
  });
});
