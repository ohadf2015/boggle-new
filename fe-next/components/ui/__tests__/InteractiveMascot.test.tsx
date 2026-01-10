/**
 * InteractiveMascot Component Tests
 *
 * Tests for the interactive mascot component with hover/click state changes
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InteractiveMascot, InteractiveMascotWithEntrance } from '../InteractiveMascot';

// Mock useDevicePerformance hook
jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    enableComplexAnimations: true,
  }),
}));

// Mock framer-motion to simplify testing
jest.mock('framer-motion', () => {
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
jest.mock('next/image', () => {
  const React = require('react');
  return function MockImage({ src, alt, ...props }: { src: string; alt: string }) {
    return React.createElement('img', { src, alt, ...props });
  };
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
      expect(img).toHaveAttribute('src', '/mascot/lexi-thinking.png');
    });
  });

  describe('size variants', () => {
    it('applies xs size class', () => {
      const { container } = render(<InteractiveMascot variant="happy" size="xs" />);
      const sizeContainer = container.querySelector('.w-10');
      expect(sizeContainer).toBeInTheDocument();
    });

    it('applies md size class by default', () => {
      const { container } = render(<InteractiveMascot variant="happy" />);
      const sizeContainer = container.querySelector('.w-24');
      expect(sizeContainer).toBeInTheDocument();
    });

    it('applies xl size class', () => {
      const { container } = render(<InteractiveMascot variant="happy" size="xl" />);
      const sizeContainer = container.querySelector('.w-40');
      expect(sizeContainer).toBeInTheDocument();
    });
  });

  describe('extended variants (mood & activity)', () => {
    it('renders mood variant with fallback image', () => {
      render(<InteractiveMascot variant="confused" />);
      const img = screen.getByRole('img');
      // 'confused' falls back to 'thinking'
      expect(img).toHaveAttribute('src', '/mascot/lexi-thinking.png');
    });

    it('renders activity variant with fallback image', () => {
      render(<InteractiveMascot variant="eating_pizza" />);
      const img = screen.getByRole('img');
      // 'eating_pizza' falls back to 'happy'
      expect(img).toHaveAttribute('src', '/mascot/lexi-happy.png');
    });

    it('renders gaming variant with fallback to excited', () => {
      render(<InteractiveMascot variant="gaming" />);
      const img = screen.getByRole('img');
      // 'gaming' falls back to 'excited'
      expect(img).toHaveAttribute('src', '/mascot/lexi-excited.png');
    });
  });

  describe('hover interactions', () => {
    it('changes variant on hover when enableHover is true', () => {
      render(
        <InteractiveMascot
          variant="happy"
          enableHover
          hoverVariant="excited"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      // The component should now show the hover variant
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/mascot/lexi-excited.png');
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
      expect(img).toHaveAttribute('src', '/mascot/lexi-happy.png');
    });

    it('calls onHover callback', () => {
      const onHover = jest.fn();
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
          clickVariant="celebrating"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/mascot/lexi-celebrating.png');
    });

    it('calls onClick callback', () => {
      const onClick = jest.fn();
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
      jest.useFakeTimers();

      render(
        <InteractiveMascot
          variant="happy"
          enableClick
          clickVariant="celebrating"
          clickDuration={500}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Immediately after click, should show click variant
      expect(screen.getByRole('img')).toHaveAttribute('src', '/mascot/lexi-celebrating.png');

      // After duration, should revert to base
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      expect(screen.getByRole('img')).toHaveAttribute('src', '/mascot/lexi-happy.png');

      jest.useRealTimers();
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
      const onClick = jest.fn();
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
      const onClick = jest.fn();
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

      // 'happy' defaults to 'excited' on hover
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/mascot/lexi-excited.png');
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

      // 'happy' defaults to 'celebrating' on click
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/mascot/lexi-celebrating.png');
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
    expect(img).toHaveAttribute('src', '/mascot/lexi-thinking.png');
  });

  it('accepts delay prop', () => {
    // Just verify it renders without error
    render(<InteractiveMascotWithEntrance variant="happy" delay={0.5} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
