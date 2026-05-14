/**
 * Tests for CurrencyDisplay component
 *
 * Tests gold currency display with animations and formatting.
 */

import { render, screen } from '@testing-library/react';
import { CurrencyDisplay } from '../CurrencyDisplay';
import '@testing-library/jest-dom';

// Mock Framer Motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('CurrencyDisplay', () => {
  describe('Basic rendering', () => {
    it('should render gold amount', () => {
      // GIVEN: Currency display with amount
      // WHEN: Rendering component
      render(<CurrencyDisplay amount={1234} />);

      // THEN: Should display formatted amount
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    it('should render coin icon', () => {
      // GIVEN: Currency display
      // WHEN: Rendering component
      const { container } = render(<CurrencyDisplay amount={100} />);

      // THEN: Should have coin icon (emoji or SVG)
      const icon = container.querySelector('[data-testid="coin-icon"]');
      expect(icon).toBeInTheDocument();
    });

    it('should format large numbers with commas', () => {
      // GIVEN: Large amount
      // WHEN: Rendering component
      render(<CurrencyDisplay amount={1234567} />);

      // THEN: Should format with comma separators
      expect(screen.getByText('1,234,567')).toBeInTheDocument();
    });

    it('should handle zero amount', () => {
      // GIVEN: Zero amount
      // WHEN: Rendering component
      render(<CurrencyDisplay amount={0} />);

      // THEN: Should display zero
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Size variants', () => {
    it('should apply small size class', () => {
      // GIVEN: Small size variant
      // WHEN: Rendering component
      const { container } = render(<CurrencyDisplay amount={100} size="sm" />);

      // THEN: Should have small size class
      const display = container.querySelector('[data-testid="currency-display"]');
      expect(display).toHaveClass('text-sm');
    });

    it('should apply medium size class by default', () => {
      // GIVEN: No size specified
      // WHEN: Rendering component
      const { container } = render(<CurrencyDisplay amount={100} />);

      // THEN: Should have medium size class
      const display = container.querySelector('[data-testid="currency-display"]');
      expect(display).toHaveClass('text-base');
    });

    it('should apply large size class', () => {
      // GIVEN: Large size variant
      // WHEN: Rendering component
      const { container } = render(<CurrencyDisplay amount={100} size="lg" />);

      // THEN: Should have large size class
      const display = container.querySelector('[data-testid="currency-display"]');
      expect(display).toHaveClass('text-lg');
    });
  });

  describe('Recent gain animation', () => {
    it('should display recent gain when provided', () => {
      // GIVEN: Recent gain amount
      // WHEN: Rendering component
      render(<CurrencyDisplay amount={1000} recentGain={150} />);

      // THEN: Should display gain with plus sign
      expect(screen.getByText('+150')).toBeInTheDocument();
    });

    it('should not display recent gain when not provided', () => {
      // GIVEN: No recent gain
      // WHEN: Rendering component
      render(<CurrencyDisplay amount={1000} />);

      // THEN: Should not display any gain text
      expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    });

    it('should not display recent gain when zero', () => {
      // GIVEN: Zero recent gain
      // WHEN: Rendering component
      render(<CurrencyDisplay amount={1000} recentGain={0} />);

      // THEN: Should not display gain text
      expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      // GIVEN: Custom className
      // WHEN: Rendering component
      const { container } = render(
        <CurrencyDisplay amount={100} className="custom-class" />
      );

      // THEN: Should have custom class
      const display = container.querySelector('[data-testid="currency-display"]');
      expect(display).toHaveClass('custom-class');
    });
  });

  describe('Neo-brutalist styling', () => {
    it('should have neo-yellow background', () => {
      // GIVEN: Currency display
      // WHEN: Rendering component
      const { container } = render(<CurrencyDisplay amount={100} />);

      // THEN: Should have yellow background
      const display = container.querySelector('[data-testid="currency-display"]');
      expect(display).toHaveClass('bg-neo-yellow');
    });

    it('should have hard shadow', () => {
      // GIVEN: Currency display
      // WHEN: Rendering component
      const { container } = render(<CurrencyDisplay amount={100} />);

      // THEN: Should have hard shadow class
      const display = container.querySelector('[data-testid="currency-display"]');
      expect(display).toHaveClass('shadow-hard');
    });

    it('should use font-neo-display', () => {
      // GIVEN: Currency display
      // WHEN: Rendering component
      const { container } = render(<CurrencyDisplay amount={100} />);

      // THEN: Should use display font
      const display = container.querySelector('[data-testid="currency-display"]');
      expect(display).toHaveClass('font-neo-display');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label for screen readers', () => {
      // GIVEN: Currency display with amount
      // WHEN: Rendering component
      const { container } = render(<CurrencyDisplay amount={1234} />);

      // THEN: Should have descriptive aria-label
      const display = container.querySelector('[data-testid="currency-display"]');
      expect(display).toHaveAttribute('aria-label');
      expect(display?.getAttribute('aria-label')).toContain('1234');
    });
  });
});
