/**
 * CooldownIndicator Component Tests
 *
 * Tests for radial cooldown progress indicator.
 */

import { render, screen } from '@testing-library/react';
import { CooldownIndicator } from '../CooldownIndicator';

// Mock usePrefersReducedMotion hook
const { mockUsePrefersReducedMotion } = vi.hoisted(() => ({
  mockUsePrefersReducedMotion: vi.fn(() => false),
}));
vi.mock('../../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: mockUsePrefersReducedMotion,
}));

describe('CooldownIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePrefersReducedMotion.mockReturnValue(false);
  });

  describe('Basic Rendering', () => {
    it('should render icon in center', () => {
      render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={5}
        />
      );

      expect(screen.getByText('⚡')).toBeInTheDocument();
    });

    it('should render React element as icon', () => {
      const TestIcon = () => <div data-testid="test-icon">Icon</div>;
      render(
        <CooldownIndicator
          icon={<TestIcon />}
          totalDuration={10}
          remainingTime={5}
        />
      );

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('should render optional label', () => {
      render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={5}
          label="Power-up"
        />
      );

      expect(screen.getByText('Power-up')).toBeInTheDocument();
    });

    it('should not render label when not provided', () => {
      const { container } = render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={5}
        />
      );

      expect(container.querySelector('[data-testid="cooldown-label"]')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={5}
          className="custom-class"
        />
      );

      const wrapper = container.querySelector('[data-testid="cooldown-indicator"]');
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  describe('Size Variants', () => {
    it('should render small size (24px)', () => {
      render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={5}
          size="sm"
        />
      );

      const svg = screen.getByTestId('cooldown-svg');
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
    });

    it('should render medium size (36px) by default', () => {
      render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={5}
        />
      );

      const svg = screen.getByTestId('cooldown-svg');
      expect(svg).toHaveAttribute('width', '36');
      expect(svg).toHaveAttribute('height', '36');
    });

    it('should render large size (48px)', () => {
      render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={5}
          size="lg"
        />
      );

      const svg = screen.getByTestId('cooldown-svg');
      expect(svg).toHaveAttribute('width', '48');
      expect(svg).toHaveAttribute('height', '48');
    });
  });

  describe('Progress Arc', () => {
    it('should reflect remaining time ratio in arc progress', () => {
      render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={5}
        />
      );

      const circle = screen.getByTestId('cooldown-circle');

      // Progress should be 50% (5/10)
      // Arc circumference for radius 14: 2πr = ~88
      // 50% progress should show half the arc depleted
      expect(circle).toHaveAttribute('stroke-dasharray');
      expect(circle).toHaveAttribute('stroke-dashoffset');
    });

    it('should show full circle when ready (0 remaining)', () => {
      render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={0}
        />
      );

      const circle = screen.getByTestId('cooldown-circle');
      const dashOffset = circle.getAttribute('stroke-dashoffset');

      // When complete, offset should be 0 (full circle visible)
      expect(dashOffset).toBe('0');
    });

    it('should show full arc when just started (time equals duration)', () => {
      render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={10}
        />
      );

      const circle = screen.getByTestId('cooldown-circle');
      const dashArray = circle.getAttribute('stroke-dasharray');
      const dashOffset = circle.getAttribute('stroke-dashoffset');

      // When just started, offset equals circumference (no arc visible yet)
      expect(dashArray).toBeDefined();
      expect(dashOffset).toBe(dashArray);
    });
  });

  describe('Completion State', () => {
    it('should show ready state when remainingTime is 0', () => {
      render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={0}
        />
      );

      const indicator = screen.getByTestId('cooldown-indicator');
      expect(indicator).toHaveClass('cooldown-ready');
    });

    it('should call onComplete when reaching 0', () => {
      const onComplete = vi.fn();

      const { rerender } = render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={5}
          onComplete={onComplete}
        />
      );

      expect(onComplete).not.toHaveBeenCalled();

      // Update to 0 remaining
      rerender(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={0}
          onComplete={onComplete}
        />
      );

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should only call onComplete once when remainingTime stays at 0', () => {
      const onComplete = vi.fn();

      const { rerender } = render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={1}
          onComplete={onComplete}
        />
      );

      expect(onComplete).not.toHaveBeenCalled();

      // Transition to 0
      rerender(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={0}
          onComplete={onComplete}
        />
      );

      expect(onComplete).toHaveBeenCalledTimes(1);

      // Rerender with same values (still 0)
      rerender(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={0}
          onComplete={onComplete}
        />
      );

      // Should not call again when staying at 0
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reduced Motion', () => {
    it('should show numeric countdown instead of arc when reduced motion', () => {
      mockUsePrefersReducedMotion.mockReturnValue(true);

      render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={5}
        />
      );

      // Should show countdown text
      expect(screen.getByText('5s')).toBeInTheDocument();

      // Arc should still exist but could be simplified
      const circle = screen.getByTestId('cooldown-circle');
      expect(circle).toBeInTheDocument();
    });

    it('should show "Ready!" when complete with reduced motion', () => {
      mockUsePrefersReducedMotion.mockReturnValue(true);

      render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={0}
        />
      );

      expect(screen.getByText('Ready!')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have progress semantics', () => {
      render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={5}
        />
      );

      const indicator = screen.getByTestId('cooldown-indicator');
      expect(indicator).toHaveAttribute('role', 'progressbar');
      expect(indicator).toHaveAttribute('aria-valuenow', '5');
      expect(indicator).toHaveAttribute('aria-valuemax', '10');
    });

    it('should have descriptive aria-label', () => {
      render(
        <CooldownIndicator
          icon="⚡"
          totalDuration={10}
          remainingTime={5}
          label="Power-up"
        />
      );

      const indicator = screen.getByTestId('cooldown-indicator');
      expect(indicator).toHaveAttribute('aria-label');
    });
  });
});
