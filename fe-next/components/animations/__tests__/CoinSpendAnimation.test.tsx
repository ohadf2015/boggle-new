/**
 * Tests for CoinSpendAnimation Component
 *
 * Tests the visual feedback animation when spending coins.
 * Shows a "drain" effect with coins flying outward.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CoinSpendAnimation } from '../CoinSpendAnimation';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock useDevicePerformance hook
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    prefersReducedMotion: false,
    enableGlowEffects: true,
    maxParticles: 8,
  }),
}));

describe('CoinSpendAnimation', () => {
  const defaultPosition = { x: 100, y: 100 };

  describe('Rendering', () => {
    it('should not render when trigger is false', () => {
      const { container } = render(
        <CoinSpendAnimation
          trigger={false}
          position={defaultPosition}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render when trigger is true', () => {
      const { container } = render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
        />
      );
      expect(container.querySelector('[data-testid="motion-div"]')).toBeInTheDocument();
    });

    it('should render amount badge with negative sign', () => {
      render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
          amount={60}
        />
      );
      expect(screen.getByText('-60')).toBeInTheDocument();
    });

    it('should render coin emoji', () => {
      render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
        />
      );
      // Multiple coin emojis are rendered (amount badge + particles)
      const coinEmojis = screen.getAllByText('🪙');
      expect(coinEmojis.length).toBeGreaterThan(0);
    });
  });

  describe('Position', () => {
    it('should apply position styles correctly', () => {
      const { container } = render(
        <CoinSpendAnimation
          trigger={true}
          position={{ x: 200, y: 300 }}
        />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ left: '200px', top: '300px' });
    });

    it('should be fixed positioned for portal rendering', () => {
      const { container } = render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
        />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('fixed');
    });

    it('should be pointer-events-none to not block clicks', () => {
      const { container } = render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
        />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('pointer-events-none');
    });

    it('should have high z-index for visibility', () => {
      const { container } = render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
        />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('z-60');
    });
  });

  describe('Amount Handling', () => {
    it('should use default amount of 60', () => {
      render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
        />
      );
      expect(screen.getByText('-60')).toBeInTheDocument();
    });

    it('should display custom amount', () => {
      render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
          amount={250}
        />
      );
      expect(screen.getByText('-250')).toBeInTheDocument();
    });

    it('should display large amounts', () => {
      render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
          amount={500}
        />
      );
      expect(screen.getByText('-500')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be hidden from screen readers', () => {
      const { container } = render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
        />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
          className="custom-animation-class"
        />
      );
      expect(container.querySelector('.custom-animation-class')).toBeInTheDocument();
    });

    it('should merge custom className with default classes', () => {
      const { container } = render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
          className="custom-class"
        />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('fixed');
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  describe('Visual Elements', () => {
    it('should render shrinking ring-3 effect', () => {
      const { container } = render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
        />
      );
      // Ring has border-neo-orange class
      const ring = container.querySelector('.border-neo-orange');
      expect(ring).toBeInTheDocument();
    });

    it('should render amount badge with correct styling', () => {
      const { container } = render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
          amount={100}
        />
      );
      const badge = container.querySelector('.rounded-neo');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-linear-to-br');
    });

    it('should render coin particles', () => {
      render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
        />
      );
      // Should have multiple coin emojis (1 in badge + particles)
      const coins = screen.getAllByText('🪙');
      expect(coins.length).toBeGreaterThanOrEqual(2);
    });

    it('should render colored particle trails', () => {
      const { container } = render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
        />
      );
      // Trail particles have w-2 h-2 classes
      const trails = container.querySelectorAll('.w-2.h-2.rounded-full');
      expect(trails.length).toBeGreaterThan(0);
    });
  });

  describe('Callback Prop', () => {
    it('should accept onComplete callback', () => {
      const onComplete = vi.fn();
      // This should not throw
      const { container } = render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
          onComplete={onComplete}
        />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should not call onComplete immediately', () => {
      const onComplete = vi.fn();
      render(
        <CoinSpendAnimation
          trigger={true}
          position={defaultPosition}
          onComplete={onComplete}
        />
      );
      // onComplete should not be called on render
      expect(onComplete).not.toHaveBeenCalled();
    });
  });
});
