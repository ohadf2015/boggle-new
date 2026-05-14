/**
 * UnfinishedBoardCard Tests
 *
 * Tests for the landing page card showing saved unfinished board.
 * TDD RED phase — written before implementation.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UnfinishedBoardCard from '../UnfinishedBoardCard';
import type { LetterGrid } from '@/shared/types/game';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: React.forwardRef(function MotionButton({ children, ...props }: any, ref: any) {
      return <button ref={ref} {...props}>{children}</button>;
    }),
  },
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'unfinishedBoard.resumeTitle': 'Your unfinished board',
        'unfinishedBoard.resumeDesc': 'You found {{found}}/{{total}} words',
        'unfinishedBoard.resumeCta': 'Resume Board',
        'unfinishedBoard.wordsWaiting': 'words waiting',
      };
      let val = translations[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          val = val.replace(`{{${k}}}`, String(v));
        });
      }
      return val;
    },
    dir: 'ltr',
  }),
}));

const mockGrid: LetterGrid = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

describe('UnfinishedBoardCard', () => {
  const defaultProps = {
    grid: mockGrid,
    missedWords: ['QUARTZ', 'JUMBLE', 'FROZEN'],
    score: 120,
    wordsFound: 15,
    totalWords: 45,
    onResume: vi.fn(),
  };

  it('should render the title', () => {
    render(<UnfinishedBoardCard {...defaultProps} />);

    expect(screen.getByText('Your unfinished board')).toBeInTheDocument();
  });

  it('should show word count progress', () => {
    render(<UnfinishedBoardCard {...defaultProps} />);

    expect(screen.getByText('You found 15/45 words')).toBeInTheDocument();
  });

  it('should render a miniature grid preview', () => {
    render(<UnfinishedBoardCard {...defaultProps} />);

    expect(screen.getByTestId('mini-grid-preview')).toBeInTheDocument();
  });

  it('should render 16 grid cells for a 4x4 grid', () => {
    render(<UnfinishedBoardCard {...defaultProps} />);

    const gridCells = screen.getAllByTestId(/^grid-cell-/);
    expect(gridCells).toHaveLength(16);
  });

  it('should show resume CTA button', () => {
    render(<UnfinishedBoardCard {...defaultProps} />);

    expect(screen.getByText('Resume Board')).toBeInTheDocument();
  });

  it('should call onResume when CTA clicked', () => {
    const onResume = vi.fn();
    render(<UnfinishedBoardCard {...defaultProps} onResume={onResume} />);

    fireEvent.click(screen.getByText('Resume Board'));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('should show number of waiting words', () => {
    render(<UnfinishedBoardCard {...defaultProps} />);

    expect(screen.getByText('3 words waiting')).toBeInTheDocument();
  });
});
