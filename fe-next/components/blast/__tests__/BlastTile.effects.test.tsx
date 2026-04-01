/**
 * BlastTile unique visual effects tests — gem glow, frozen crack, ice shimmer.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastTile } from '../BlastTile';

vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

const baseProps = {
  letter: 'A',
  phase: 'idle' as const,
  isSelected: false,
  isCleared: false,
  onClick: vi.fn(),
};

describe('BlastTile unique effects', () => {
  describe('gem glow intensification', () => {
    it('adds blast-tile-gem-glow-3 class at full health (3 hits)', () => {
      render(<BlastTile {...baseProps} type="gem" hitsRemaining={3} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-tile-gem-glow-3');
    });

    it('adds blast-tile-gem-glow-2 class at 2 hits remaining', () => {
      render(<BlastTile {...baseProps} type="gem" hitsRemaining={2} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-tile-gem-glow-2');
    });

    it('adds blast-tile-gem-glow-1 class at 1 hit remaining (brightest)', () => {
      render(<BlastTile {...baseProps} type="gem" hitsRemaining={1} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-tile-gem-glow-1');
    });

    it('does not add gem glow classes to non-gem tiles', () => {
      render(<BlastTile {...baseProps} type="ice" hitsRemaining={2} />);
      const button = screen.getByRole('button');
      expect(button.className).not.toMatch(/blast-tile-gem-glow/);
    });
  });

  describe('frozen crack overlay', () => {
    it('adds blast-tile-frozen-cracked class on first hit (hitsRemaining=1)', () => {
      render(<BlastTile {...baseProps} type="frozen" hitsRemaining={1} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-tile-frozen-cracked');
    });

    it('does not add frozen-cracked at full health', () => {
      render(<BlastTile {...baseProps} type="frozen" hitsRemaining={2} />);
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('blast-tile-frozen-cracked');
    });

    it('does not add frozen-cracked to non-frozen tiles', () => {
      render(<BlastTile {...baseProps} type="ice" hitsRemaining={1} />);
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('blast-tile-frozen-cracked');
    });
  });

  describe('ice frost shimmer', () => {
    it('adds blast-tile-ice-shimmer class to ice tiles', () => {
      render(<BlastTile {...baseProps} type="ice" hitsRemaining={2} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('blast-tile-ice-shimmer');
    });

    it('does not add ice-shimmer to non-ice tiles', () => {
      render(<BlastTile {...baseProps} type="gem" hitsRemaining={3} />);
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('blast-tile-ice-shimmer');
    });
  });

  describe('gem golden flash on clearing', () => {
    it('adds blast-tile-gem-golden-flash class during clearing phase', () => {
      const { container } = render(
        <BlastTile {...baseProps} type="gem" phase="clearing" />
      );
      const button = container.querySelector('button');
      expect(button?.className).toContain('blast-tile-gem-golden-flash');
    });

    it('does not add golden-flash on non-gem clearing', () => {
      const { container } = render(
        <BlastTile {...baseProps} type="bomb" phase="clearing" />
      );
      const button = container.querySelector('button');
      expect(button?.className).not.toContain('blast-tile-gem-golden-flash');
    });
  });

  describe('frozen emergence glow on clearing', () => {
    it('adds blast-tile-frozen-emerge class during clearing phase', () => {
      const { container } = render(
        <BlastTile {...baseProps} type="frozen" phase="clearing" />
      );
      const button = container.querySelector('button');
      expect(button?.className).toContain('blast-tile-frozen-emerge');
    });
  });
});
