/**
 * TileBadge Component Tests
 *
 * Tests for adventure tile badge rendering (gold, rainbow, bomb, chain, time, frost)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TileBadge } from '../TileBadge';
import type { TileType } from '@/types/adventure';

describe('TileBadge', () => {
  describe('Gold Badge', () => {
    it('should render gold badge with 3x multiplier', () => {
      const { container } = render(<TileBadge type="gold" />);

      expect(screen.getByText('3x')).toBeInTheDocument();

      const badge = screen.getByText('3x');
      expect(badge).toHaveClass('tile-gold-badge');
      expect(badge).toHaveClass('text-neo-yellow');
    });

    it('should position gold badge at top-right', () => {
      const { container } = render(<TileBadge type="gold" />);

      const badge = screen.getByText('3x');
      expect(badge).toHaveClass('-top-1.5');
      expect(badge).toHaveClass('-inset-e-1.5');
    });

    it('should have glow shadow on gold badge', () => {
      const { container } = render(<TileBadge type="gold" />);

      const badge = screen.getByText('3x');
      expect(badge.className).toContain('shadow-');
    });
  });

  // Note: 'rainbow' and 'chain' tile types are not in the current TileType union.
  // These tests are intentionally omitted until those types are added to the implementation.

  describe('Bomb Badge', () => {
    it('should render bomb badge with icon', () => {
      const { container } = render(<TileBadge type="bomb" />);

      // Bomb uses Lucide icon, check for the icon component
      const bombIcon = container.querySelector('svg');
      expect(bombIcon).toBeInTheDocument();
    });

    it('should render bomb row indicator', () => {
      const { container } = render(<TileBadge type="bomb" />);

      const rowIndicator = container.querySelector('.tile-bomb-row-indicator');
      expect(rowIndicator).toBeInTheDocument();
    });

    it('should have orange border on bomb badge', () => {
      const { container } = render(<TileBadge type="bomb" />);

      const badge = container.querySelector('.border-orange-500');
      expect(badge).toBeInTheDocument();
    });
  });

  // Note: 'chain' tile type is not in the current TileType union; tests omitted.

  describe('Time Badge', () => {
    it('should render time badge with clock icon', () => {
      const { container } = render(<TileBadge type="time" />);

      // Time uses Lucide Clock icon
      const clockIcon = container.querySelector('svg');
      expect(clockIcon).toBeInTheDocument();
    });

    it('should have emerald border on time badge', () => {
      const { container } = render(<TileBadge type="time" />);

      const badge = container.querySelector('.border-emerald-400');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Frost Overlay', () => {
    it('should render frost overlay for frozen ice tiles', () => {
      const { container } = render(<TileBadge type="ice" isFrozen={true} />);

      const frostOverlay = container.querySelector('.frost-overlay');
      expect(frostOverlay).toBeInTheDocument();
    });

    it('should NOT render frost overlay for non-frozen ice tiles', () => {
      const { container } = render(<TileBadge type="ice" isFrozen={false} />);

      const frostOverlay = container.querySelector('.frost-overlay');
      expect(frostOverlay).not.toBeInTheDocument();
    });

    it('should have gradient on frost overlay without backdrop-blur (perf: removed sub-perceptible blur)', () => {
      const { container } = render(<TileBadge type="ice" isFrozen={true} />);

      const frostOverlay = container.querySelector('.frost-overlay');
      expect(frostOverlay).toHaveClass('bg-linear-to-br');
      expect(frostOverlay).not.toHaveClass('backdrop-blur-[2px]');
    });
  });

  describe('Standard Tiles', () => {
    it('should render nothing for standard tiles', () => {
      const { container } = render(<TileBadge type="standard" />);

      // Standard tiles have no badge
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing for locked tiles', () => {
      const { container } = render(<TileBadge type="locked" />);

      // Locked tiles handled differently (not a badge)
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing for multiplier tiles', () => {
      const { container } = render(<TileBadge type="multiplier" />);

      // Multiplier tiles handled differently (not a badge)
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Badge Positioning', () => {
    it('should position all badges in top-right corner', () => {
      const types: TileType[] = ['gold', 'bomb', 'time'];

      types.forEach((type) => {
        const { container } = render(<TileBadge type={type} />);

        // All badges should have absolute positioning in top-right
        const badge = container.querySelector('[class*="-top-"]');
        expect(badge).toHaveClass('absolute');
        expect(badge).toHaveClass('z-20');
      });
    });
  });

  describe('Badge Shadows', () => {
    it('should have glow shadows on special tile badges', () => {
      const types: TileType[] = ['gold', 'bomb', 'time'];

      types.forEach((type) => {
        const { container } = render(<TileBadge type={type} />);

        // All special tile badges should have shadow effects
        const badge = container.querySelector('[class*="shadow-"]');
        expect(badge).toBeInTheDocument();
      });
    });
  });
});
