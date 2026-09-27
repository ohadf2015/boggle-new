/**
 * TDD: WordHuntBoardReview
 * Tests for the board review component shown in Word Hunt results
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, initial, animate, transition, exit, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, initial, animate, transition, whileHover, whileTap, exit, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  Grid3X3: (props: any) => <svg data-testid="grid-icon" {...props} />,
  ChevronDown: (props: any) => <svg data-testid="chevron-icon" {...props} />,
  ChevronUp: (props: any) => <svg data-testid="chevron-up-icon" {...props} />,
}));

import { WordHuntBoardReview } from '../WordHuntBoardReview';

const mockT = (key: string) => key;

const sampleGrid = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['H', 'E', 'L'],
];

describe('WordHuntBoardReview', () => {
  it('should render a toggle button', () => {
    render(
      <WordHuntBoardReview
        grid={sampleGrid}
        targetWord="cat"
        t={mockT}
      />
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('wordHunt.mp.viewBoard')).toBeInTheDocument();
  });

  it('should show the grid when toggled open', () => {
    render(
      <WordHuntBoardReview
        grid={sampleGrid}
        targetWord="cat"
        t={mockT}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('board-review-grid')).toBeInTheDocument();
  });

  it('should display all grid letters', () => {
    render(
      <WordHuntBoardReview
        grid={sampleGrid}
        targetWord="cat"
        t={mockT}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    // All letters should be visible
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('should highlight letters from the target word', () => {
    render(
      <WordHuntBoardReview
        grid={sampleGrid}
        targetWord="cat"
        t={mockT}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    // Letters C, A, T should be highlighted (they match target word letters)
    const cCell = screen.getByText('C').closest('[data-highlighted]');
    expect(cCell).toHaveAttribute('data-highlighted', 'true');
  });

  it('should not render when grid is null', () => {
    const { container } = render(
      <WordHuntBoardReview
        grid={null}
        targetWord="cat"
        t={mockT}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
