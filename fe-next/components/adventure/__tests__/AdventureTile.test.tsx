/**
 * AdventureTile Tests
 *
 * Tests for adventure mode special tile visual rendering
 * Following TDD: Write tests FIRST, then implement
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AdventureTile from '../AdventureTile';
import type { TileState } from '@/types/adventure';

// ==============================================
// TEST FIXTURES
// ==============================================

function createTileState(overrides?: Partial<TileState>): TileState {
  return {
    letter: 'A',
    type: 'standard',
    isCleared: false,
    ...overrides,
  };
}

// ==============================================
// TESTS
// ==============================================

describe('AdventureTile', () => {
  describe('Standard Tile', () => {
    it('should render letter correctly', () => {
      // GIVEN
      const tile = createTileState({ letter: 'X' });

      // WHEN
      render(<AdventureTile tile={tile} />);

      // THEN
      expect(screen.getByText('X')).toBeInTheDocument();
    });

    it('should render with standard tile styling', () => {
      // GIVEN
      const tile = createTileState({ type: 'standard' });

      // WHEN
      const { container } = render(<AdventureTile tile={tile} />);

      // THEN
      expect(container.firstChild).not.toHaveClass('tile-gold');
      expect(container.firstChild).not.toHaveClass('tile-ice');
      expect(container.firstChild).not.toHaveClass('tile-bomb');
      expect(container.firstChild).not.toHaveClass('tile-rainbow');
    });

    it('should apply cleared state styling', () => {
      // GIVEN
      const tile = createTileState({ isCleared: true });

      // WHEN
      const { container } = render(<AdventureTile tile={tile} />);

      // THEN
      expect(container.firstChild).toHaveClass('tile-cleared');
    });
  });

  describe('Gold Tile', () => {
    it('should render with gold styling', () => {
      // GIVEN
      const tile = createTileState({ type: 'gold' });

      // WHEN
      const { container } = render(<AdventureTile tile={tile} />);

      // THEN
      expect(container.firstChild).toHaveClass('tile-gold');
    });

    it('should display 3x multiplier indicator', () => {
      // GIVEN
      const tile = createTileState({ type: 'gold' });

      // WHEN
      render(<AdventureTile tile={tile} />);

      // THEN
      expect(screen.getByText('3x')).toBeInTheDocument();
    });

    it('should apply gold glow effect', () => {
      // GIVEN
      const tile = createTileState({ type: 'gold' });

      // WHEN
      const { container } = render(<AdventureTile tile={tile} />);

      // THEN - Check for glow class or style
      const tileElement = container.firstChild as HTMLElement;
      expect(tileElement.className).toMatch(/gold/i);
    });
  });

  describe('Ice Tile', () => {
    it('should render with ice styling', () => {
      // GIVEN
      const tile = createTileState({ type: 'ice', isFrozen: true });

      // WHEN
      const { container } = render(<AdventureTile tile={tile} />);

      // THEN
      expect(container.firstChild).toHaveClass('tile-ice');
    });

    it('should display frozen visual when isFrozen is true', () => {
      // GIVEN
      const tile = createTileState({ type: 'ice', isFrozen: true });

      // WHEN
      const { container } = render(<AdventureTile tile={tile} />);

      // THEN
      expect(container.firstChild).toHaveClass('tile-frozen');
    });

    it('should NOT display frozen visual after clearing', () => {
      // GIVEN
      const tile = createTileState({
        type: 'ice',
        isFrozen: false,
        isCleared: true,
      });

      // WHEN
      const { container } = render(<AdventureTile tile={tile} />);

      // THEN
      expect(container.firstChild).not.toHaveClass('tile-frozen');
    });

    it('should have frost overlay element', () => {
      // GIVEN
      const tile = createTileState({ type: 'ice', isFrozen: true });

      // WHEN
      const { container } = render(<AdventureTile tile={tile} />);

      // THEN
      const frostOverlay = container.querySelector('.frost-overlay');
      expect(frostOverlay).toBeInTheDocument();
    });
  });

  describe('Bomb Tile', () => {
    it('should render with bomb styling', () => {
      // GIVEN
      const tile = createTileState({ type: 'bomb' });

      // WHEN
      const { container } = render(<AdventureTile tile={tile} />);

      // THEN
      expect(container.firstChild).toHaveClass('tile-bomb');
    });

    it('should display bomb icon', () => {
      // GIVEN
      const tile = createTileState({ type: 'bomb' });

      // WHEN
      render(<AdventureTile tile={tile} />);

      // THEN - Check for bomb icon (could be SVG or emoji)
      const bombIcon = screen.getByTestId('bomb-icon');
      expect(bombIcon).toBeInTheDocument();
    });

    it('should have pulse animation class', () => {
      // GIVEN
      const tile = createTileState({ type: 'bomb' });

      // WHEN
      const { container } = render(<AdventureTile tile={tile} />);

      // THEN
      expect(container.querySelector('.bomb-pulse')).toBeInTheDocument();
    });
  });

  describe('Rainbow Tile', () => {
    it('should render with rainbow styling', () => {
      // GIVEN
      const tile = createTileState({ type: 'rainbow' });

      // WHEN
      const { container } = render(<AdventureTile tile={tile} />);

      // THEN
      expect(container.firstChild).toHaveClass('tile-rainbow');
    });

    it('should display wildcard indicator', () => {
      // GIVEN
      const tile = createTileState({ type: 'rainbow' });

      // WHEN
      render(<AdventureTile tile={tile} />);

      // THEN
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should have rainbow gradient animation', () => {
      // GIVEN
      const tile = createTileState({ type: 'rainbow' });

      // WHEN
      const { container } = render(<AdventureTile tile={tile} />);

      // THEN
      expect(container.querySelector('.rainbow-gradient')).toBeInTheDocument();
    });
  });

  describe('Selection State', () => {
    it('should apply selected styling when isSelected is true', () => {
      // GIVEN
      const tile = createTileState();

      // WHEN
      const { container } = render(
        <AdventureTile tile={tile} isSelected={true} />
      );

      // THEN
      expect(container.firstChild).toHaveClass('tile-selected');
    });

    it('should NOT apply selected styling when isSelected is false', () => {
      // GIVEN
      const tile = createTileState();

      // WHEN
      const { container } = render(
        <AdventureTile tile={tile} isSelected={false} />
      );

      // THEN
      expect(container.firstChild).not.toHaveClass('tile-selected');
    });
  });

  describe('Cascade Animation', () => {
    it('should apply cascade delay style when cascadeDelay is provided', () => {
      // GIVEN
      const tile = createTileState({ cascadeDelay: 200 });

      // WHEN
      const { container } = render(<AdventureTile tile={tile} />);

      // THEN
      const tileElement = container.firstChild as HTMLElement;
      expect(tileElement.style.animationDelay).toBe('200ms');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible role', () => {
      // GIVEN
      const tile = createTileState({ letter: 'B' });

      // WHEN
      const { container } = render(<AdventureTile tile={tile} />);

      // THEN
      expect(container.firstChild).toHaveAttribute('role', 'gridcell');
    });

    it('should have accessible label for special tiles', () => {
      // GIVEN
      const tile = createTileState({ type: 'gold', letter: 'G' });

      // WHEN
      render(<AdventureTile tile={tile} />);

      // THEN
      const tileElement = screen.getByRole('gridcell');
      expect(tileElement).toHaveAttribute(
        'aria-label',
        expect.stringContaining('gold')
      );
    });
  });
});
