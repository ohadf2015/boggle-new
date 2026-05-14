/**
 * InteractiveMascot Component Tests
 *
 * All variants now render via <img> (animated WebP). MP4s replaced for cross-device compat.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InteractiveMascot, InteractiveMascotWithEntrance } from '../InteractiveMascot';

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    enableComplexAnimations: true,
  }),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const MockMotionDiv = React.forwardRef(
    ({ children, animate, initial, exit, whileHover, whileTap, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) =>
      React.createElement('div', { ...props, ref }, children)
  );
  MockMotionDiv.displayName = 'MockMotionDiv';
  return {
    m: {
      div: MockMotionDiv,
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => children,
  };
});

vi.mock('next/image', () => {
  const React = require('react');
  return { default: function MockImage({ src, alt, ...props }: { src: string; alt: string }) {
    return React.createElement('img', { src, alt, ...props });
  } };
});

function getMascotEl(container: HTMLElement): HTMLImageElement {
  const el = container.querySelector('img');
  if (!el) throw new Error('No mascot element rendered');
  return el;
}

describe('InteractiveMascot', () => {
  describe('rendering', () => {
    it('renders default variant (happy → winner.webp)', () => {
      const { container } = render(<InteractiveMascot variant="happy" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/mascot/winner.webp');
    });

    it('renders custom alt text', () => {
      const { container } = render(<InteractiveMascot variant="happy" alt="Custom alt" />);
      const img = container.querySelector('img');
      expect(img).toHaveAttribute('alt', 'Custom alt');
    });

    it('renders correct webp src for previously-opaque variant', () => {
      const { container } = render(<InteractiveMascot variant="thinking" />);
      const img = container.querySelector('img');
      expect(img).toHaveAttribute('src', '/mascot/question.webp');
    });

    it('renders <img> for transparent WebP variant', () => {
      const { container } = render(<InteractiveMascot variant="onfire" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/mascot/onfire-nobg.webp');
    });

    it('never renders <video>', () => {
      const { container } = render(<InteractiveMascot variant="happy" />);
      expect(container.querySelector('video')).toBeNull();
    });
  });

  describe('size variants', () => {
    it('applies xs size class (100px minimum)', () => {
      const { container } = render(<InteractiveMascot variant="happy" size="xs" />);
      expect(container.querySelector('.w-\\[100px\\]')).toBeInTheDocument();
    });

    it('applies md size class by default', () => {
      const { container } = render(<InteractiveMascot variant="happy" />);
      expect(container.querySelector('.w-32')).toBeInTheDocument();
    });

    it('applies xl size class', () => {
      const { container } = render(<InteractiveMascot variant="happy" size="xl" />);
      expect(container.querySelector('.w-48')).toBeInTheDocument();
    });
  });

  describe('extended variants (mood & activity)', () => {
    it('renders mood variant with fallback (confused → thinking → question.webp)', () => {
      const { container } = render(<InteractiveMascot variant="confused" />);
      expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/question.webp');
    });

    it('renders activity variant (eating_pizza → happy → winner.webp)', () => {
      const { container } = render(<InteractiveMascot variant="eating_pizza" />);
      expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/winner.webp');
    });

    it('renders gaming variant', () => {
      const { container } = render(<InteractiveMascot variant="gaming" />);
      expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/play.webp');
    });

    it('renders activity variant (skateboarding → gaming → play.webp)', () => {
      const { container } = render(<InteractiveMascot variant="skateboarding" />);
      expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/play.webp');
    });

    it('renders activity variant (dancing → dj → dj.webp)', () => {
      const { container } = render(<InteractiveMascot variant="dancing" />);
      expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/dj.webp');
    });
  });

  describe('hover interactions', () => {
    it('changes variant on hover when enableHover is true', () => {
      const { container } = render(
        <InteractiveMascot
          variant="happy"
          enableHover
          hoverVariant="gaming"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/play.webp');
    });

    it('reverts to base variant on mouse leave (excited → onfire on hover, back to happy)', () => {
      const { container } = render(
        <InteractiveMascot
          variant="happy"
          enableHover
          hoverVariant="excited"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/onfire-nobg.webp');

      fireEvent.mouseLeave(button);
      expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/winner.webp');
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
      const { container } = render(
        <InteractiveMascot
          variant="happy"
          enableClick
          clickVariant="gaming"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/play.webp');
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

      const { container } = render(
        <InteractiveMascot
          variant="happy"
          enableClick
          clickVariant="gaming"
          clickDuration={500}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/play.webp');

      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/winner.webp');

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
      const { container } = render(
        <InteractiveMascot
          variant="happy"
          enableHover
        />
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      // 'happy' defaults to 'gaming' on hover
      expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/play.webp');
    });

    it('uses default click transition when clickVariant not specified', () => {
      const { container } = render(
        <InteractiveMascot
          variant="happy"
          enableClick
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // 'happy' defaults to 'celebration' on click
      expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/celebration.webp');
    });
  });
});

describe('InteractiveMascotWithEntrance', () => {
  it('renders correctly', () => {
    const { container } = render(<InteractiveMascotWithEntrance variant="happy" />);
    expect(getMascotEl(container)).toBeInTheDocument();
  });

  it('passes props to InteractiveMascot', () => {
    const { container } = render(
      <InteractiveMascotWithEntrance
        variant="thinking"
        size="lg"
        enableHover
        enableClick
      />
    );
    expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/question.webp');
  });

  it('accepts delay prop', () => {
    const { container } = render(<InteractiveMascotWithEntrance variant="happy" delay={0.5} />);
    expect(getMascotEl(container)).toBeInTheDocument();
  });
});
