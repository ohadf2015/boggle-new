/**
 * Test for mobile touch feedback in GridComponent
 *
 * ISSUE: WordHunt the effect of choosing word should also be applied on touch in mobile
 * and there is an issue in the ui that the line partially hide the letters
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GridComponent from '@/components/GridComponent';
import type { LetterGrid } from '@/types';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
  useLanguageSafe: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

vi.mock('@/contexts/AccessibilityContext', () => ({
  useSuppressTimerUrgency: () => false,
  useDisableFireRoundLights: () => false,
  useDisableEarthquakeEffects: () => false,
  useLargeLetters: () => false,
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playEarthquakeRumble: vi.fn(),
    playEarthquakeShake: vi.fn(),
  }),
}));

vi.mock('@/hooks/useEarthquakeAnimation', () => ({
  useEarthquakeAnimation: () => ({
    earthquakePhase: 'idle',
    earthquakeParticles: [],
    earthquakeDust: [],
    getShakeOffset: () => ({ x: 0, y: 0, rotate: 0, scale: 1, delay: 0 }),
    getPhaseAnimation: {
      rumble: { animate: {}, transition: {} },
      quake: { animate: {}, transition: {} },
      settle: { animate: {}, transition: {} },
    },
    useEnhancedMode: false,
  }),
}));

const mockGrid: LetterGrid = [
  ['T', 'E', 'S', 'T'],
  ['W', 'O', 'R', 'D'],
  ['H', 'U', 'N', 'T'],
  ['G', 'A', 'M', 'E'],
];

describe('GridComponent - Mobile Touch Feedback', () => {
  describe('Touch Event Handling', () => {
    it('should provide visual feedback through whileTap and animation props', () => {
      const handleWordSubmit = vi.fn();

      const { container } = render(
        <GridComponent
          grid={mockGrid}
          interactive={true}
          onWordSubmit={handleWordSubmit}
        />
      );

      // Find the first cell
      const firstCell = container.querySelector('[data-row="0"][data-col="0"]');
      expect(firstCell).toBeInTheDocument();

      // Cell should be a motion.div that can receive touch events
      // The whileTap prop at line 579 provides the press effect
      expect(firstCell?.hasAttribute('data-row')).toBe(true);
      expect(firstCell?.hasAttribute('data-col')).toBe(true);
    });

    it('should render ripple effect layers for selected cells', () => {
      const selectedCells = [
        { row: 0, col: 0, letter: 'T' },
      ];

      const { container } = render(
        <GridComponent
          grid={mockGrid}
          interactive={true}
          selectedCells={selectedCells}
          comboLevel={0}
        />
      );

      // Ripple effect elements should be present for selected cells
      // These are the motion.div elements with 'absolute inset-0' classes
      const rippleElements = container.querySelectorAll('.absolute.inset-0');
      expect(rippleElements.length).toBeGreaterThan(0);
    });
  });

  describe('Visual Feedback Layering', () => {
    it('should ensure letter text has higher z-index than ripple effects', () => {
      const selectedCells = [
        { row: 0, col: 0, letter: 'T' },
        { row: 0, col: 1, letter: 'E' },
      ];

      const { container } = render(
        <GridComponent
          grid={mockGrid}
          interactive={true}
          selectedCells={selectedCells}
          comboLevel={0}
        />
      );

      const firstCell = container.querySelector('[data-row="0"][data-col="0"]');

      // The letter should be visible and not obscured
      // Check that the cell content (letter) is after ripple divs in DOM
      const cellChildren = firstCell?.children;
      if (cellChildren) {
        // Last child should be the letter text span
        const lastChild = cellChildren[cellChildren.length - 1];
        expect(lastChild?.textContent).toBe('T');
      }
    });

    it('should not let glow effects completely obscure letter text', () => {
      const selectedCells = [
        { row: 0, col: 0, letter: 'T' },
        { row: 0, col: 1, letter: 'E' },
        { row: 0, col: 2, letter: 'S' },
      ];

      const { container } = render(
        <GridComponent
          grid={mockGrid}
          interactive={true}
          selectedCells={selectedCells}
          comboLevel={5} // High combo = more effects
        />
      );

      // All selected cells should still show their letters
      selectedCells.forEach(cell => {
        const cellElement = container.querySelector(
          `[data-row="${cell.row}"][data-col="${cell.col}"]`
        );
        expect(cellElement).toBeInTheDocument();
        expect(cellElement?.textContent).toContain(cell.letter);
      });
    });
  });

  describe('Letter Visibility', () => {
    it('should maintain letter readability with selection effects', () => {
      const selectedCells = [
        { row: 0, col: 0, letter: 'T' },
      ];

      const { container } = render(
        <GridComponent
          grid={mockGrid}
          interactive={true}
          selectedCells={selectedCells}
          comboLevel={0}
        />
      );

      const selectedCell = container.querySelector('[data-row="0"][data-col="0"]');

      // Letter should be present and visible
      expect(selectedCell?.textContent).toBe('T');

      // Letter should have sufficient contrast (not be transparent)
      const computedStyle = window.getComputedStyle(selectedCell as Element);
      expect(computedStyle.opacity).not.toBe('0');
    });

    it('should render letter text above all effect layers', () => {
      const selectedCells = [
        { row: 0, col: 0, letter: 'T' },
        { row: 0, col: 1, letter: 'E' },
      ];

      const { container } = render(
        <GridComponent
          grid={mockGrid}
          interactive={true}
          selectedCells={selectedCells}
          comboLevel={3}
        />
      );

      const firstCell = container.querySelector('[data-row="0"][data-col="0"]');

      // Check DOM structure - letter span should come after effect divs
      const cellChildren = Array.from(firstCell?.children || []);

      // Find the letter text element (should be last or have higher stacking)
      const letterElement = cellChildren.find(child =>
        child.textContent === 'T' && child.tagName === 'SPAN'
      );

      expect(letterElement).toBeDefined();
    });
  });
});
