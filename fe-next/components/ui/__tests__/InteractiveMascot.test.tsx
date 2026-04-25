/**
 * InteractiveMascot Component Tests
 *
 * Tests for the interactive mascot component with hover/click state changes.
 * Split-format aware: opaque variants render <video> (MP4), transparent variants render <img> (animated WebP).
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

/** Returns the active mascot element (video for MP4, img for WebP). */
function getMascotEl(container: HTMLElement): HTMLVideoElement | HTMLImageElement {
  const el = container.querySelector('video, img') as HTMLVideoElement | HTMLImageElement | null;
  if (!el) throw new Error('No mascot element rendered');
  return el;
}

describe('InteractiveMascot', () => {
  describe('rendering', () => {
    it('renders with default variant (happy → MP4 video)', () => {
      const { container } = render(<InteractiveMascot variant="happy" />);
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('aria-label', 'Lexi mascot - happy');
    });

    it('renders with custom alt text on video', () => {
      const { container } = render(<InteractiveMascot variant="happy" alt="Custom alt" />);
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('aria-label', 'Custom alt');
    });

    it('renders the correct MP4 source for opaque variant', () => {
      const { container } = render(<InteractiveMascot variant="thinking" />);
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('src', '/mascot/question.mp4');
    });

    it('renders <img> for transparent WebP variant', () => {
      const { container } = render(<InteractiveMascot variant="onfire" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/mascot/onfire-nobg.webp');
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
    it('renders mood variant with fallback asset (confused → thinking → MP4)', () => {
      const { container } = render(<InteractiveMascot variant="confused" />);
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('src', '/mascot/question.mp4');
    });

    it('renders activity variant mapped to MP4 (eating_pizza → happy → winner.mp4)', () => {
      const { container } = render(<InteractiveMascot variant="eating_pizza" />);
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('src', '/mascot/winner.mp4');
    });

    it('renders gaming variant with MP4', () => {
      const { container } = render(<InteractiveMascot variant="gaming" />);
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('src', '/mascot/play.mp4');
    });

    it('renders activity variant mapped to MP4 (skateboarding → gaming → play.mp4)', () => {
      const { container } = render(<InteractiveMascot variant="skateboarding" />);
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('src', '/mascot/play.mp4');
    });

    it('renders activity variant mapped to MP4 (dancing → dj → dj.mp4)', () => {
      const { container } = render(<InteractiveMascot variant="dancing" />);
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('src', '/mascot/dj.mp4');
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

      // After hover, should display the gaming MP4
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('src', '/mascot/play.mp4');
    });

    it('reverts to base variant on mouse leave (excited → onfire WebP on hover, back to happy MP4)', () => {
      const { container } = render(
        <InteractiveMascot
          variant="happy"
          enableHover
          hoverVariant="excited"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      // During hover: excited → onfire → transparent WebP → <img>
      expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/onfire-nobg.webp');

      fireEvent.mouseLeave(button);
      // After leave: back to happy → MP4 → <video>
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('src', '/mascot/winner.mp4');
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

      const video = container.querySelector('video');
      expect(video).toHaveAttribute('src', '/mascot/play.mp4');
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

      // Immediately after click, should show click variant (gaming MP4)
      expect(container.querySelector('video')).toHaveAttribute('src', '/mascot/play.mp4');

      // After duration, should revert to base (happy → winner.mp4)
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(container.querySelector('video')).toHaveAttribute('src', '/mascot/winner.mp4');

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
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('src', '/mascot/play.mp4');
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
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('src', '/mascot/celebration.mp4');
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
    const video = container.querySelector('video');
    expect(video).toHaveAttribute('src', '/mascot/question.mp4');
  });

  it('accepts delay prop', () => {
    const { container } = render(<InteractiveMascotWithEntrance variant="happy" delay={0.5} />);
    expect(getMascotEl(container)).toBeInTheDocument();
  });
});
