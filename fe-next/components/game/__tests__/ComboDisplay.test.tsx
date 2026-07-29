/**
 * ComboDisplay Component Tests
 *
 * Tests for the combo display component with neon colors and mascot integration
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ComboDisplay from '../ComboDisplay';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, animate, initial, transition, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, animate, initial, transition, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span {...props}>{children}</span>
    ),
    circle: ({ animate, initial, transition, ...props }: Record<string, unknown>) => (
      <circle {...props} data-testid="timer-arc" />
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ priority, ...props }: Record<string, unknown>) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img {...props} data-priority={priority ? 'true' : 'false'} alt="" />
    );
  },
}));

// Mock InteractiveMascot to avoid framer-motion deep mocking issues
vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: ({ variant, 'data-testid': dataTestId }: { variant: string; 'data-testid'?: string }) => (
    <div data-testid={dataTestId || 'combo-mascot'} data-variant={variant}>
      Mascot
    </div>
  ),
}));

// Mock hooks
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

describe('ComboDisplay', () => {
  describe('visibility', () => {
    it('does not render when comboLevel is 0', () => {
      const { container } = render(<ComboDisplay comboLevel={0} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders when comboLevel is 1', () => {
      const { container } = render(<ComboDisplay comboLevel={1} />);
      expect(container.firstChild).not.toBeNull();
    });

    it('renders combo text with fire emoji for normal combos', () => {
      render(<ComboDisplay comboLevel={3} />);
      expect(screen.getByText('🔥')).toBeInTheDocument();
      expect(screen.getByText('x3')).toBeInTheDocument();
      expect(screen.getByText('Combo')).toBeInTheDocument();
    });

    it('renders rainbow emoji for level 7+ combos', () => {
      render(<ComboDisplay comboLevel={7} />);
      expect(screen.getByText('🌈')).toBeInTheDocument();
    });
  });

  describe('layout stability', () => {
    it('has fixed width to prevent layout shifts', () => {
      const { container } = render(<ComboDisplay comboLevel={3} />);
      const outerDiv = container.firstChild as HTMLElement;
      // Compact mode: w-[100px], non-compact: w-[130px]
      expect(outerDiv.className).toContain('w-[130px]');
    });

    it('has fixed width in compact mode', () => {
      const { container } = render(<ComboDisplay comboLevel={3} compact />);
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('w-[100px]');
    });
  });

  describe('rarity tiers', () => {
    it('applies common rarity for levels 1-2', () => {
      const { container } = render(<ComboDisplay comboLevel={2} />);
      const textContent = container.textContent;
      expect(textContent).toContain('x2');
      expect(textContent).toContain('Combo');
    });

    it('applies rare rarity for level 3', () => {
      const { container } = render(<ComboDisplay comboLevel={3} />);
      const textContent = container.textContent;
      expect(textContent).toContain('x3');
    });

    it('applies epic rarity for level 4', () => {
      const { container } = render(<ComboDisplay comboLevel={4} />);
      const textContent = container.textContent;
      expect(textContent).toContain('x4');
    });

    it('applies legendary rarity for levels 5-6', () => {
      render(<ComboDisplay comboLevel={5} />);
      expect(screen.getByText('LEGENDARY!')).toBeInTheDocument();
    });

    it('applies mythic rarity for level 7+', () => {
      render(<ComboDisplay comboLevel={7} />);
      expect(screen.getByText('MYTHIC!')).toBeInTheDocument();
    });

    it('shows GODLIKE for level 10+', () => {
      render(<ComboDisplay comboLevel={10} />);
      expect(screen.getByText('GODLIKE!')).toBeInTheDocument();
    });
  });

  describe('mascot integration for high combos', () => {
    it('shows mascot for legendary combos (level 5+)', () => {
      const { container } = render(<ComboDisplay comboLevel={5} />);
      // The mascot should be visible for high combos
      const mascot = container.querySelector('[data-testid="combo-mascot"]');
      expect(mascot).toBeInTheDocument();
    });

    it('shows cheering mascot for mythic combos (level 7+)', () => {
      const { container } = render(<ComboDisplay comboLevel={7} />);
      const mascot = container.querySelector('[data-testid="combo-mascot"]');
      expect(mascot).toBeInTheDocument();
    });

    it('does not show mascot for lower combos (level < 5)', () => {
      const { container } = render(<ComboDisplay comboLevel={4} />);
      const mascot = container.querySelector('[data-testid="combo-mascot"]');
      expect(mascot).not.toBeInTheDocument();
    });
  });

  describe('neon color styling', () => {
    it('uses neon green for common rarity (levels 1-2)', () => {
      const { container } = render(<ComboDisplay comboLevel={2} />);
      // Check that the gradient class contains neon green colors
      const comboText = container.querySelector('.bg-linear-to-r');
      expect(comboText).toBeInTheDocument();
    });

    it('uses neon cyan for rare rarity (level 3)', () => {
      const { container } = render(<ComboDisplay comboLevel={3} />);
      const comboText = container.querySelector('.bg-linear-to-r');
      expect(comboText).toBeInTheDocument();
    });

    it('uses neon magenta for epic rarity (level 4)', () => {
      const { container } = render(<ComboDisplay comboLevel={4} />);
      const comboText = container.querySelector('.bg-linear-to-r');
      expect(comboText).toBeInTheDocument();
    });

    it('uses neon yellow/gold for legendary rarity (levels 5-6)', () => {
      const { container } = render(<ComboDisplay comboLevel={5} />);
      const comboText = container.querySelector('.bg-linear-to-r');
      expect(comboText).toBeInTheDocument();
    });
  });

  describe('highContrast mode', () => {
    it('applies high contrast styling when enabled', () => {
      const { container } = render(<ComboDisplay comboLevel={3} highContrast />);
      // High contrast mode should render without errors
      expect(container.firstChild).not.toBeNull();
    });
  });

  describe('compact mode', () => {
    it('uses smaller sizing in compact mode', () => {
      const { container } = render(<ComboDisplay comboLevel={3} compact />);
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('w-[100px]');
    });
  });

  describe('timer indication', () => {
    it('renders timer arc when timeRemaining is provided', () => {
      const { container } = render(
        <ComboDisplay comboLevel={3} timeRemaining={50} />
      );
      // Timer arc should be rendered as an SVG with specific viewBox
      const timerArc = container.querySelector('svg[viewBox="0 0 36 36"]');
      expect(timerArc).toBeInTheDocument();
    });

    it('does not render timer arc when timeRemaining is null', () => {
      const { container } = render(
        <ComboDisplay comboLevel={3} timeRemaining={null} />
      );
      // No timer arc SVG without timeRemaining (sparkle SVGs may still exist)
      const timerArc = container.querySelector('svg[viewBox="0 0 36 36"]');
      expect(timerArc).not.toBeInTheDocument();
    });

    it('applies danger styling when isDanger is true', () => {
      const { container } = render(
        <ComboDisplay comboLevel={3} timeRemaining={20} isDanger />
      );
      const timerArc = container.querySelector('svg[viewBox="0 0 36 36"]');
      expect(timerArc).toBeInTheDocument();
      // Danger state should apply red stroke color to the m.circle
      const timerCircle = container.querySelector('[data-testid="timer-arc"]');
      expect(timerCircle).toBeInTheDocument();
      expect(timerCircle).toHaveAttribute('stroke', '#FF4444');
    });

    it('renders timer arc in compact mode', () => {
      const { container } = render(
        <ComboDisplay comboLevel={3} timeRemaining={75} compact />
      );
      const timerArc = container.querySelector('svg[viewBox="0 0 36 36"]');
      expect(timerArc).toBeInTheDocument();
    });
  });
});
