/**
 * InteractiveMascot Component Tests
 *
 * Tests for the interactive mascot component with hover/click state changes
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InteractiveMascot, InteractiveMascotWithEntrance } from '../InteractiveMascot';

// Mock useDevicePerformance hook
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    enableComplexAnimations: true,
  }),
}));

// Mock framer-motion to simplify testing
vi.mock('framer-motion', () => {
  const React = require('react');
  const MockMotionDiv = React.forwardRef(
    ({ children, animate, initial, exit, whileHover, whileTap, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) =>
      React.createElement('div', { ...props, ref }, children)
  );
  MockMotionDiv.displayName = 'MockMotionDiv';
  return {
    motion: {
      div: MockMotionDiv,
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => children,
  };
});

// Mock next/image
vi.mock('next/image', () => {
  const React = require('react');
  return { default: function MockImage({ src, alt, ...props }: { src: string; alt: string }) {
    return React.createElement('img', { src, alt, ...props });
  } };
});

describe('InteractiveMascot', () => {
  describe('rendering', () => {
    it('renders with default variant', () => {
      render(<InteractiveMascot variant="happy" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Lexi mascot - happy');
    });

    it('renders with custom alt text', () => {
      render(<InteractiveMascot variant="happy" alt="Custom alt" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Custom alt');
    });

    it('renders the correct image source for variant', () => {
      render(<InteractiveMascot variant="thinking" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/mascot/study.gif');
    });
  });

  describe('size variants', () => {
    it('applies xs size class (100px minimum)', () => {
      const { container } = render(<InteractiveMascot variant="happy" size="xs" />);
      const sizeContainer = container.querySelector('.w-\\[100px\\]');
      expect(sizeContainer).toBeInTheDocument();
    });

    it('applies md size class by default', () => {
      const { container } = render(<InteractiveMascot variant="happy" />);
      const sizeContainer = container.querySelector('.w-32');
      expect(sizeContainer).toBeInTheDocument();
    });

    it('applies xl size class', () => {
      const { container } = render(<InteractiveMascot variant="happy" size="xl" />);
      const sizeContainer = container.querySelector('.w-48');
      expect(sizeContainer).toBeInTheDocument();
    });
  });

  describe('extended variants (mood & activity)', () => {
    it('renders mood variant with fallback image', () => {
      render(<InteractiveMascot variant="confused" />);
      const img = screen.getByRole('img');
      // 'confused' falls back to 'thinking' (which is now a GIF variant)
      expect(img).toHaveAttribute('src', '/mascot/study.gif');
    });

    it('renders activity variant mapped to GIF (eating_pizza → happy)', () => {
      render(<InteractiveMascot variant="eating_pizza" />);
      const img = screen.getByRole('img');
      // eating_pizza maps to happy GIF
      expect(img).toHaveAttribute('src', '/mascot/main.gif');
    });

    it('renders gaming variant with GIF', () => {
      render(<InteractiveMascot variant="gaming" />);
      const img = screen.getByRole('img');
      // gaming is a base GIF variant
      expect(img).toHaveAttribute('src', '/mascot/play.gif');
    });

    it('renders activity variant mapped to GIF (skateboarding → gaming)', () => {
      render(<InteractiveMascot variant="skateboarding" />);
      const img = screen.getByRole('img');
      // skateboarding maps to gaming GIF
      expect(img).toHaveAttribute('src', '/mascot/play.gif');
    });

    it('renders activity variant mapped to GIF (dancing → dj)', () => {
      render(<InteractiveMascot variant="dancing" />);
      const img = screen.getByRole('img');
      // dancing maps to dj GIF
      expect(img).toHaveAttribute('src', '/mascot/dj.gif');
    });
  });

  describe('hover interactions', () => {
    it('changes variant on hover when enableHover is true', () => {
      render(
        <InteractiveMascot
          variant="happy"
          enableHover
          hoverVariant="gaming"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      // The component should now show the hover variant (gaming GIF)
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/mascot/play.gif');
    });

    it('reverts to base variant on mouse leave', () => {
      render(
        <InteractiveMascot
          variant="happy"
          enableHover
          hoverVariant="excited"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/mascot/main.gif');
    });

    it('calls onHover callback', () => {
      const onHover = vi.fn();
      render(
        <InteractiveMascot
          variant="happy"
          enableHover
          onHover={onHover}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      expect(onHover).toHaveBeenCalledWith(true);

      fireEvent.mouseLeave(button);
      expect(onHover).toHaveBeenCalledWith(false);
    });
  });

  describe('click interactions', () => {
    it('changes variant on click when enableClick is true', () => {
      render(
        <InteractiveMascot
          variant="happy"
          enableClick
          clickVariant="gaming"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const img = screen.getByRole('img');
      // celebrating maps to happy, but we're using gaming directly for testing
      expect(img).toHaveAttribute('src', '/mascot/play.gif');
    });

    it('calls onClick callback', () => {
      const onClick = vi.fn();
      render(
        <InteractiveMascot
          variant="happy"
          enableClick
          onClick={onClick}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('reverts to base variant after clickDuration', async () => {
      vi.useFakeTimers();

      render(
        <InteractiveMascot
          variant="happy"
          enableClick
          clickVariant="gaming"
          clickDuration={500}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Immediately after click, should show click variant (gaming GIF)
      expect(screen.getByRole('img')).toHaveAttribute('src', '/mascot/play.gif');

      // After duration, should revert to base
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByRole('img')).toHaveAttribute('src', '/mascot/main.gif');

      vi.useRealTimers();
    });
  });

  describe('accessibility', () => {
    it('has button role when interactive', () => {
      render(<InteractiveMascot variant="happy" enableClick />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has aria-label', () => {
      render(<InteractiveMascot variant="happy" enableClick ariaLabel="Click the mascot" />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Click the mascot');
    });

    it('is focusable when interactive', () => {
      render(<InteractiveMascot variant="happy" enableClick />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    it('responds to keyboard events', () => {
      const onClick = vi.fn();
      render(
        <InteractiveMascot
          variant="happy"
          enableClick
          onClick={onClick}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('responds to space key', () => {
      const onClick = vi.fn();
      render(
        <InteractiveMascot
          variant="happy"
          enableClick
          onClick={onClick}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('tooltip', () => {
    it('shows tooltip on hover when provided', () => {
      render(
        <InteractiveMascot
          variant="happy"
          enableHover
          tooltip="Hello there!"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      expect(screen.getByText('Hello there!')).toBeInTheDocument();
    });

    it('hides tooltip on mouse leave', () => {
      render(
        <InteractiveMascot
          variant="happy"
          enableHover
          tooltip="Hello there!"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      expect(screen.getByText('Hello there!')).toBeInTheDocument();

      fireEvent.mouseLeave(button);
      expect(screen.queryByText('Hello there!')).not.toBeInTheDocument();
    });
  });

  describe('default state transitions', () => {
    it('uses default hover transition when hoverVariant not specified', () => {
      render(
        <InteractiveMascot
          variant="happy"
          enableHover
        />
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      // 'happy' defaults to 'gaming' on hover (updated for GIF variants)
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/mascot/play.gif');
    });

    it('uses default click transition when clickVariant not specified', () => {
      render(
        <InteractiveMascot
          variant="happy"
          enableClick
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // 'happy' defaults to 'celebration' on click
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/mascot/celebration.gif');
    });
  });
});

describe('InteractiveMascotWithEntrance', () => {
  it('renders correctly', () => {
    render(<InteractiveMascotWithEntrance variant="happy" />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
  });

  it('passes props to InteractiveMascot', () => {
    render(
      <InteractiveMascotWithEntrance
        variant="thinking"
        size="lg"
        enableHover
        enableClick
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/mascot/study.gif');
  });

  it('accepts delay prop', () => {
    // Just verify it renders without error
    render(<InteractiveMascotWithEntrance variant="happy" delay={0.5} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
