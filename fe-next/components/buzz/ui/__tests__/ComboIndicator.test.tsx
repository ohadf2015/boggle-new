/**
 * ComboIndicator Component Tests
 *
 * Tests for the streak/combo display component
 */

import { render, screen } from '@testing-library/react';
import ComboIndicator from '../ComboIndicator';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('ComboIndicator', () => {
  describe('visibility', () => {
    it('should not render when streak is 0', () => {
      // GIVEN/WHEN
      const { container } = render(
        <ComboIndicator streak={0} showComboAnimation={false} />
      );

      // THEN
      expect(container.firstChild).toBeNull();
    });

    it('should render when streak is 1 or more', () => {
      // GIVEN/WHEN
      render(<ComboIndicator streak={1} showComboAnimation={false} />);

      // THEN
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('streak display', () => {
    it('should display the current streak count', () => {
      // GIVEN/WHEN
      render(<ComboIndicator streak={3} showComboAnimation={false} />);

      // THEN
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display streak of 5', () => {
      // GIVEN/WHEN
      render(<ComboIndicator streak={5} showComboAnimation={false} />);

      // THEN
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('multiplier display', () => {
    it('should not show multiplier when streak is 1', () => {
      // GIVEN/WHEN
      render(<ComboIndicator streak={1} showComboAnimation={false} />);

      // THEN
      expect(screen.queryByText(/x1/)).not.toBeInTheDocument();
    });

    it('should show x1.1 multiplier when streak is 2', () => {
      // GIVEN/WHEN
      render(<ComboIndicator streak={2} showComboAnimation={false} />);

      // THEN
      expect(screen.getByText('x1.1')).toBeInTheDocument();
    });

    it('should show x1.25 multiplier when streak is 3', () => {
      // GIVEN/WHEN
      render(<ComboIndicator streak={3} showComboAnimation={false} />);

      // THEN
      expect(screen.getByText('x1.3')).toBeInTheDocument();
    });

    it('should show x1.5 multiplier when streak is 4', () => {
      // GIVEN/WHEN
      render(<ComboIndicator streak={4} showComboAnimation={false} />);

      // THEN
      expect(screen.getByText('x1.5')).toBeInTheDocument();
    });

    it('should show x2.0 multiplier when streak is 5', () => {
      // GIVEN/WHEN
      render(<ComboIndicator streak={5} showComboAnimation={false} />);

      // THEN
      expect(screen.getByText('x2.0')).toBeInTheDocument();
    });
  });

  describe('combo animation text', () => {
    it('should show "NICE!" when showComboAnimation is true and streak is 2', () => {
      // GIVEN/WHEN
      render(<ComboIndicator streak={2} showComboAnimation={true} />);

      // THEN
      expect(screen.getByText('NICE!')).toBeInTheDocument();
    });

    it('should show "COMBO!" when showComboAnimation is true and streak is 3', () => {
      // GIVEN/WHEN
      render(<ComboIndicator streak={3} showComboAnimation={true} />);

      // THEN
      expect(screen.getByText('COMBO!')).toBeInTheDocument();
    });

    it('should show "ON FIRE!" when showComboAnimation is true and streak is 5', () => {
      // GIVEN/WHEN
      render(<ComboIndicator streak={5} showComboAnimation={true} />);

      // THEN
      expect(screen.getByText('ON FIRE!')).toBeInTheDocument();
    });

    it('should not show combo text when showComboAnimation is false', () => {
      // GIVEN/WHEN
      render(<ComboIndicator streak={3} showComboAnimation={false} />);

      // THEN
      expect(screen.queryByText('COMBO!')).not.toBeInTheDocument();
    });
  });
});
