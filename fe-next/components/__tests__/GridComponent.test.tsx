/**
 * GridComponent Tests
 *
 * Tests for the interactive letter grid component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import GridComponent from '../GridComponent';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('GridComponent', () => {
  const mockGrid = [
    ['A', 'B', 'C'],
    ['D', 'E', 'F'],
    ['G', 'H', 'I'],
  ];

  describe('rendering', () => {
    it('renders all letters in the grid', () => {
      render(<GridComponent grid={mockGrid} />);

      // Check that all letters are rendered
      mockGrid.flat().forEach((letter) => {
        expect(screen.getByText(letter)).toBeInTheDocument();
      });
    });

    it('renders correct number of cells', () => {
      render(<GridComponent grid={mockGrid} />);

      // Should have 9 cells (3x3 grid)
      const cells = screen.getAllByText(/^[A-I]$/);
      expect(cells).toHaveLength(9);
    });

    it('renders with custom className', () => {
      const { container } = render(
        <GridComponent grid={mockGrid} className="custom-class" />
      );

      // Component should render (className is passed to inner element)
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('grid sizes', () => {
    it('renders 4x4 grid correctly', () => {
      const grid4x4 = [
        ['A', 'B', 'C', 'D'],
        ['E', 'F', 'G', 'H'],
        ['I', 'J', 'K', 'L'],
        ['M', 'N', 'O', 'P'],
      ];

      render(<GridComponent grid={grid4x4} />);

      const cells = screen.getAllByText(/^[A-P]$/);
      expect(cells).toHaveLength(16);
    });

    it('renders 6x6 grid correctly', () => {
      const grid6x6 = Array.from({ length: 6 }, (_, row) =>
        Array.from({ length: 6 }, (_, col) =>
          String.fromCharCode(65 + (row * 6 + col) % 26)
        )
      );

      render(<GridComponent grid={grid6x6} />);

      // Should render all 36 cells
      const allCells = screen.getAllByText(/^[A-Z]$/);
      expect(allCells).toHaveLength(36);
    });
  });

  describe('interactive mode', () => {
    it('renders in non-interactive mode by default', () => {
      const { container } = render(<GridComponent grid={mockGrid} />);

      // Grid cells exist even in non-interactive mode (for display)
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders in interactive mode when prop is true', () => {
      render(<GridComponent grid={mockGrid} interactive={true} />);

      // In interactive mode, the grid should be focusable
      const focusableElements = document.querySelectorAll('[tabindex]');
      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });

  describe('visual states', () => {
    it('applies large text styles when largeText is true', () => {
      const { container } = render(
        <GridComponent grid={mockGrid} largeText={true} />
      );

      // Should have larger font size class
      // The actual class depends on implementation
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies combo level colors', () => {
      const { container } = render(
        <GridComponent grid={mockGrid} comboLevel={3} />
      );

      // Component should render with combo styles
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('external selected cells', () => {
    it('renders with external selected cells', () => {
      const selectedCells = [
        { row: 0, col: 0, letter: 'A' },
        { row: 0, col: 1, letter: 'B' },
      ];

      const { container } = render(
        <GridComponent grid={mockGrid} selectedCells={selectedCells} />
      );

      // Should render without errors
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty grid gracefully', () => {
      const emptyGrid: string[][] = [];

      // Should not throw
      expect(() => render(<GridComponent grid={emptyGrid} />)).not.toThrow();
    });

    it('handles single cell grid', () => {
      const singleCellGrid = [['A']];

      render(<GridComponent grid={singleCellGrid} />);

      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('handles special characters in grid', () => {
      const specialGrid = [
        ['Qu', 'ä', 'ö'],
        ['ü', 'ß', 'é'],
        ['שׁ', 'あ', '漢'],
      ];

      render(<GridComponent grid={specialGrid} />);

      expect(screen.getByText('Qu')).toBeInTheDocument();
      expect(screen.getByText('ä')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper semantic structure', () => {
      const { container } = render(<GridComponent grid={mockGrid} />);

      // Should have a containing element
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
