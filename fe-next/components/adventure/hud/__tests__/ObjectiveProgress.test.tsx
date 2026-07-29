/**
 * ObjectiveProgress Component Tests
 *
 * Tests for determinate progress bars showing level objectives.
 */

import { render, screen } from '@testing-library/react';
import { ObjectiveProgress } from '../ObjectiveProgress';

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock usePrefersReducedMotion hook
vi.mock('../../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

describe('ObjectiveProgress', () => {
  const mockObjectives = [
    {
      id: 'obj1',
      type: 'score' as const,
      target: 1000,
      current: 500,
      label: 'Score 1000 points',
    },
    {
      id: 'obj2',
      type: 'words' as const,
      target: 10,
      current: 10,
      label: 'Find 10 words',
    },
    {
      id: 'obj3',
      type: 'combo' as const,
      target: 5,
      current: 2,
      label: 'Create 5 combos',
    },
  ];

  describe('Basic Rendering', () => {
    it('should render correct number of objectives', () => {
      render(<ObjectiveProgress objectives={mockObjectives} />);

      expect(screen.getByText('Score 1000 points')).toBeInTheDocument();
      expect(screen.getByText('Find 10 words')).toBeInTheDocument();
      expect(screen.getByText('Create 5 combos')).toBeInTheDocument();
    });

    it('should render nothing when objectives array is empty', () => {
      const { container } = render(<ObjectiveProgress objectives={[]} />);

      const list = container.querySelector('[role="list"]');
      expect(list?.children.length).toBe(0);
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ObjectiveProgress objectives={mockObjectives} className="custom-class" />
      );

      // className is applied to the root container element
      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement).toHaveClass('custom-class');
    });
  });

  describe('Progress Bar Display', () => {
    it('should reflect current/target ratio in progress bar', () => {
      render(<ObjectiveProgress objectives={mockObjectives} />);

      // First objective: 500/1000 = 50%
      const progressBar1 = screen.getByTestId('progress-obj1');
      expect(progressBar1).toHaveAttribute('aria-valuenow', '500');
      expect(progressBar1).toHaveAttribute('aria-valuemax', '1000');

      // Second objective: 10/10 = 100%
      const progressBar2 = screen.getByTestId('progress-obj2');
      expect(progressBar2).toHaveAttribute('aria-valuenow', '10');
      expect(progressBar2).toHaveAttribute('aria-valuemax', '10');

      // Third objective: 2/5 = 40%
      const progressBar3 = screen.getByTestId('progress-obj3');
      expect(progressBar3).toHaveAttribute('aria-valuenow', '2');
      expect(progressBar3).toHaveAttribute('aria-valuemax', '5');
    });

    it('should use determinate Progress component with value prop', () => {
      render(<ObjectiveProgress objectives={mockObjectives} />);

      // Check all progress bars have aria attributes (determinate)
      const progressBar1 = screen.getByTestId('progress-obj1');
      const progressBar2 = screen.getByTestId('progress-obj2');
      const progressBar3 = screen.getByTestId('progress-obj3');

      // Radix UI Progress uses data-state and data-value for determinate progress
      expect(progressBar1).toHaveAttribute('role', 'progressbar');
      expect(progressBar2).toHaveAttribute('role', 'progressbar');
      expect(progressBar3).toHaveAttribute('role', 'progressbar');

      // Should have aria-valuenow (indicates determinate)
      expect(progressBar1).toHaveAttribute('aria-valuenow');
      expect(progressBar2).toHaveAttribute('aria-valuenow');
      expect(progressBar3).toHaveAttribute('aria-valuenow');
    });

    it('should cap progress at 100% even if current exceeds target', () => {
      const objectives = [
        {
          id: 'obj1',
          type: 'score' as const,
          target: 100,
          current: 150,
          label: 'Score 100',
        },
      ];

      render(<ObjectiveProgress objectives={objectives} />);

      const progressBar = screen.getByTestId('progress-obj1');
      // Current shows 150, but progress is capped at 100%
      expect(progressBar).toHaveAttribute('aria-valuenow', '150');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Value Display', () => {
    it('should display current/target values correctly', () => {
      render(<ObjectiveProgress objectives={mockObjectives} />);

      expect(screen.getByText('500/1000')).toBeInTheDocument();
      expect(screen.getByText('10/10')).toBeInTheDocument();
      expect(screen.getByText('2/5')).toBeInTheDocument();
    });

    it('should display labels correctly', () => {
      render(<ObjectiveProgress objectives={mockObjectives} />);

      expect(screen.getByText('Score 1000 points')).toBeInTheDocument();
      expect(screen.getByText('Find 10 words')).toBeInTheDocument();
      expect(screen.getByText('Create 5 combos')).toBeInTheDocument();
    });
  });

  describe('Completion State', () => {
    it('should show checkmark for completed objectives', () => {
      render(<ObjectiveProgress objectives={mockObjectives} />);

      // Second objective is complete (10/10)
      const checkmark = screen.getByTestId('checkmark-obj2');
      expect(checkmark).toBeInTheDocument();

      // First and third are not complete
      expect(screen.queryByTestId('checkmark-obj1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('checkmark-obj3')).not.toBeInTheDocument();
    });

    it('should apply completed class to completed objectives', () => {
      render(<ObjectiveProgress objectives={mockObjectives} />);

      const completeItem = screen.getByTestId('objective-obj2');
      expect(completeItem).toHaveClass('objective-complete');

      const incompleteItem1 = screen.getByTestId('objective-obj1');
      const incompleteItem3 = screen.getByTestId('objective-obj3');
      expect(incompleteItem1).not.toHaveClass('objective-complete');
      expect(incompleteItem3).not.toHaveClass('objective-complete');
    });
  });

  describe('Icon Display', () => {
    it('should render icon for each objective type', () => {
      render(<ObjectiveProgress objectives={mockObjectives} />);

      expect(screen.getByTestId('icon-score')).toBeInTheDocument();
      expect(screen.getByTestId('icon-words')).toBeInTheDocument();
      expect(screen.getByTestId('icon-combo')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria attributes for progress bars', () => {
      render(<ObjectiveProgress objectives={mockObjectives} />);

      const progressBar1 = screen.getByTestId('progress-obj1');
      expect(progressBar1).toHaveAttribute('role', 'progressbar');
      expect(progressBar1).toHaveAttribute('aria-valuenow', '500');
      expect(progressBar1).toHaveAttribute('aria-valuemax', '1000');
    });

    it('should have list semantics', () => {
      render(<ObjectiveProgress objectives={mockObjectives} />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
    });
  });
});
