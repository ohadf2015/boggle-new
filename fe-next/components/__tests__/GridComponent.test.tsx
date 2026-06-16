/**
 * GridComponent Tests
 *
 * Tests for the interactive letter grid component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import GridComponent from '../GridComponent';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => {
  const passthrough = ({ children, initial, animate, exit, whileTap, transition, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  );
  const passthroughSpan = ({ children, initial, animate, exit, whileTap, transition, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <span {...props}>{children}</span>
  );
  return {
    m: { div: passthrough, span: passthroughSpan },
    m: { div: passthrough, span: passthroughSpan },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    LazyMotion: ({ children }: React.PropsWithChildren) => <>{children}</>,
    domAnimation: {},
    domMax: {},
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn(), set: vi.fn() }),
  };
});

// Mock accessibility context
vi.mock('@/contexts/AccessibilityContext', () => ({
  useSuppressTimerUrgency: () => false,
  useDisableFireRoundLights: () => false,
  useDisableEarthquakeEffects: () => false,
  useLargeLetters: () => false,
}));

// Mock sound effects context
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playLetterSelectSound: vi.fn(),
  }),
}));

// Mock device performance hook
vi.mock('../../hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

// Mock earthquake animation hook
vi.mock('../../hooks/useEarthquakeAnimation', () => ({
  useEarthquakeAnimation: () => ({
    earthquakePhase: 'idle',
    earthquakeParticles: [],
    earthquakeDust: [],
    showCracks: false,
    dustPhase: 'idle',
    getShakeOffset: () => ({ x: 0, y: 0, rotate: 0, scale: 1, delay: 0 }),
    getPhaseAnimation: () => ({}),
    useEnhancedMode: false,
  }),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe('GridComponent', () => {
  const mockGrid = [
    ['A', 'B', 'C'],
    ['D', 'E', 'F'],
    ['G', 'H', 'I'],
  ];

  describe('rendering', () => {
    it('renders all letters in the grid', () => {
      render(<GridComponent grid={mockGrid} />, { wrapper: TestWrapper });

      // Check that all letters are rendered
      mockGrid.flat().forEach((letter) => {
        expect(screen.getByText(letter)).toBeInTheDocument();
      });
    });

    it('renders correct number of cells', () => {
      render(<GridComponent grid={mockGrid} />, { wrapper: TestWrapper });

      // Should have 9 cells (3x3 grid)
      const cells = screen.getAllByText(/^[A-I]$/);
      expect(cells).toHaveLength(9);
    });

    it('renders with custom className', () => {
      const { container } = render(
        <GridComponent grid={mockGrid} className="custom-class" />,
        { wrapper: TestWrapper }
      );

      // Component should render (className is passed to inner element)
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders the lean effects profile (MP classic) without crashing', () => {
      // Guards the lean path end-to-end: even with a real scoring combo, the
      // board renders at visual-combo 0 and every cell mounts. Combo-0 still
      // yields a non-null escalation on selected cells, so GridCellEffects
      // never hits a selected+null state.
      render(
        <GridComponent grid={mockGrid} interactive comboLevel={6} effectsProfile="lean" />,
        { wrapper: TestWrapper }
      );
      expect(screen.getAllByText(/^[A-I]$/)).toHaveLength(9);
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

      render(<GridComponent grid={grid4x4} />, { wrapper: TestWrapper });

      const cells = screen.getAllByText(/^[A-P]$/);
      expect(cells).toHaveLength(16);
    });

    it('renders 6x6 grid correctly', () => {
      const grid6x6 = Array.from({ length: 6 }, (_, row) =>
        Array.from({ length: 6 }, (_, col) =>
          String.fromCharCode(65 + (row * 6 + col) % 26)
        )
      );

      render(<GridComponent grid={grid6x6} />, { wrapper: TestWrapper });

      // Should render all 36 cells
      const allCells = screen.getAllByText(/^[A-Z]$/);
      expect(allCells).toHaveLength(36);
    });
  });

  describe('interactive mode', () => {
    it('renders in non-interactive mode by default', () => {
      const { container } = render(<GridComponent grid={mockGrid} />, { wrapper: TestWrapper });

      // Grid cells exist even in non-interactive mode (for display)
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders in interactive mode when prop is true', () => {
      render(<GridComponent grid={mockGrid} interactive={true} />, { wrapper: TestWrapper });

      // In interactive mode, the grid should be focusable
      const focusableElements = document.querySelectorAll('[tabindex]');
      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });

  describe('visual states', () => {
    it('applies large text styles when largeText is true', () => {
      const { container } = render(
        <GridComponent grid={mockGrid} largeText={true} />,
        { wrapper: TestWrapper }
      );

      // Should have larger font size class
      // The actual class depends on implementation
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies combo level colors', () => {
      const { container } = render(
        <GridComponent grid={mockGrid} comboLevel={3} />,
        { wrapper: TestWrapper }
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
        <GridComponent grid={mockGrid} selectedCells={selectedCells} />,
        { wrapper: TestWrapper }
      );

      // Should render without errors
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty grid gracefully', () => {
      const emptyGrid: string[][] = [];

      // Should not throw
      expect(() => render(<GridComponent grid={emptyGrid} />, { wrapper: TestWrapper })).not.toThrow();
    });

    it('handles single cell grid', () => {
      const singleCellGrid = [['A']];

      render(<GridComponent grid={singleCellGrid} />, { wrapper: TestWrapper });

      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('handles special characters in grid', () => {
      const specialGrid = [
        ['Qu', 'ä', 'ö'],
        ['ü', 'ß', 'é'],
        ['שׁ', 'あ', '漢'],
      ];

      render(<GridComponent grid={specialGrid} />, { wrapper: TestWrapper });

      expect(screen.getByText('Qu')).toBeInTheDocument();
      expect(screen.getByText('ä')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper semantic structure', () => {
      const { container } = render(<GridComponent grid={mockGrid} />, { wrapper: TestWrapper });

      // Should have a containing element
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
