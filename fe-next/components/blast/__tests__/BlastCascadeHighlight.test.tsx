import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CascadeHighlightData } from '../types';

// Mock framer-motion
jest.mock('framer-motion', () => {
  const React = require('react');
  const Div = React.forwardRef(function MockMotionDiv({ children, ...rest }: any, ref: any) {
    return React.createElement('div', { ref, ...rest }, children);
  });
  return {
    motion: { div: Div },
    AnimatePresence: ({ children }: any) => children,
  };
});

import { BlastCascadeHighlight } from '../BlastCascadeHighlight';

describe('BlastCascadeHighlight', () => {
  const defaultProps = {
    gridSize: 6,
  };

  it('renders nothing when highlightData is null', () => {
    const { container } = render(
      <BlastCascadeHighlight {...defaultProps} highlightData={null} />
    );
    expect(container.querySelector('[data-testid="cascade-highlight-overlay"]')).toBeNull();
  });

  it('renders glow cells for each tile in a single word path', () => {
    const highlightData: CascadeHighlightData = {
      words: [{
        word: 'test',
        path: [
          { row: 0, col: 2 },
          { row: 1, col: 2 },
          { row: 2, col: 2 },
          { row: 3, col: 2 },
        ],
        score: 5,
        chainLevel: 1,
      }],
    };

    render(
      <BlastCascadeHighlight {...defaultProps} highlightData={highlightData} />
    );

    const glowCells = screen.getAllByTestId(/^cascade-glow-/);
    expect(glowCells).toHaveLength(4);
  });

  it('renders glow cells for multiple simultaneous cascade words', () => {
    const highlightData: CascadeHighlightData = {
      words: [
        {
          word: 'test',
          path: [
            { row: 0, col: 1 },
            { row: 1, col: 1 },
            { row: 2, col: 1 },
            { row: 3, col: 1 },
          ],
          score: 5,
          chainLevel: 1,
        },
        {
          word: 'game',
          path: [
            { row: 0, col: 4 },
            { row: 1, col: 4 },
            { row: 2, col: 4 },
            { row: 3, col: 4 },
          ],
          score: 5,
          chainLevel: 1,
        },
      ],
    };

    render(
      <BlastCascadeHighlight {...defaultProps} highlightData={highlightData} />
    );

    const glowCells = screen.getAllByTestId(/^cascade-glow-/);
    expect(glowCells).toHaveLength(8);
  });

  it('positions glow cells using CSS Grid (gridRow/gridColumn)', () => {
    const highlightData: CascadeHighlightData = {
      words: [{
        word: 'ab',
        path: [
          { row: 2, col: 3 },
          { row: 3, col: 3 },
        ],
        score: 2,
        chainLevel: 1,
      }],
    };

    render(
      <BlastCascadeHighlight {...defaultProps} highlightData={highlightData} />
    );

    const firstCell = screen.getByTestId('cascade-glow-2-3');
    // CSS Grid: row+1, col+1
    expect(firstCell.style.gridRow).toBe('3');
    expect(firstCell.style.gridColumn).toBe('4');
  });

  it('renders overlay container with CSS Grid layout', () => {
    const highlightData: CascadeHighlightData = {
      words: [{
        word: 'test',
        path: [
          { row: 0, col: 2 },
          { row: 1, col: 2 },
          { row: 2, col: 2 },
          { row: 3, col: 2 },
        ],
        score: 5,
        chainLevel: 1,
      }],
    };

    render(
      <BlastCascadeHighlight {...defaultProps} highlightData={highlightData} />
    );

    const overlay = screen.getByTestId('cascade-highlight-overlay');
    expect(overlay.style.gridTemplateColumns).toContain('repeat(6');
  });
});
