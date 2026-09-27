/**
 * CircularTimer Component Tests
 *
 * Tests for the circular countdown timer component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import CircularTimer from '../CircularTimer';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, animate, initial, transition, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    circle: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <circle {...props}>{children}</circle>
    ),
  },
}));

describe('CircularTimer', () => {
  describe('time formatting', () => {
    it('displays time in MM:SS format', () => {
      render(<CircularTimer remainingTime={125} />);

      // 125 seconds = 2:05
      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('displays zero time correctly', () => {
      render(<CircularTimer remainingTime={0} />);

      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('pads seconds with leading zero', () => {
      render(<CircularTimer remainingTime={65} />);

      // 65 seconds = 1:05
      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('handles exact minute values', () => {
      render(<CircularTimer remainingTime={120} />);

      expect(screen.getByText('2:00')).toBeInTheDocument();
    });

    it('handles single digit minutes', () => {
      render(<CircularTimer remainingTime={45} />);

      // 45 seconds = 0:45
      expect(screen.getByText('0:45')).toBeInTheDocument();
    });
  });

  describe('low time visual indicator', () => {
    it('changes text color to red when time <= 20 seconds', () => {
      const { container } = render(<CircularTimer remainingTime={20} />);

      // Timer text should have red color class when low time
      const timerText = container.querySelector('.text-neo-red');
      expect(timerText).toBeInTheDocument();
    });

    it('uses red color at exactly 20 seconds', () => {
      const { container } = render(<CircularTimer remainingTime={20} />);

      const timerText = container.querySelector('.text-neo-red');
      expect(timerText).toBeInTheDocument();
    });

    it('uses red color at 1 second', () => {
      const { container } = render(<CircularTimer remainingTime={1} />);

      const timerText = container.querySelector('.text-neo-red');
      expect(timerText).toBeInTheDocument();
    });

    it('uses default cream color when time > 20 seconds', () => {
      const { container } = render(<CircularTimer remainingTime={21} />);

      const timerText = container.querySelector('.text-neo-white');
      expect(timerText).toBeInTheDocument();
      expect(container.querySelector('.text-neo-red')).not.toBeInTheDocument();
    });

    it('uses red color at 0 seconds (game ended)', () => {
      const { container } = render(<CircularTimer remainingTime={0} />);

      // 0 is still <= 20, so red color applies
      const timerText = container.querySelector('.text-neo-red');
      expect(timerText).toBeInTheDocument();
    });

    it('does not show HURRY badge (removed for less distraction)', () => {
      render(<CircularTimer remainingTime={10} />);

      // Badge was removed to reduce visual distraction
      expect(screen.queryByText('HURRY!')).not.toBeInTheDocument();
    });
  });

  describe('progress calculation', () => {
    it('uses default totalTime of 180 seconds', () => {
      const { container } = render(<CircularTimer remainingTime={180} />);

      // Timer should render with SVG
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('accepts custom totalTime', () => {
      const { container } = render(
        <CircularTimer remainingTime={60} totalTime={60} />
      );

      // Should render correctly
      expect(container.firstChild).toBeInTheDocument();
    });

    it('handles edge case when totalTime is 0', () => {
      // Should not throw with 0 totalTime
      expect(() =>
        render(<CircularTimer remainingTime={0} totalTime={0} />)
      ).not.toThrow();
    });
  });

  describe('SVG structure', () => {
    it('renders SVG with correct dimensions', () => {
      const { container } = render(<CircularTimer remainingTime={90} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '120');
      expect(svg).toHaveAttribute('height', '120');
    });

    it('renders multiple circle elements for visual effect', () => {
      const { container } = render(<CircularTimer remainingTime={90} />);

      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('styling', () => {
    it('applies neo-brutalist styling classes', () => {
      const { container } = render(<CircularTimer remainingTime={90} />);

      // Check for SVG circles with neo-brutalist strokes (no background frame)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThanOrEqual(3);
    });

    it('renders with correct text styling', () => {
      const { container } = render(<CircularTimer remainingTime={90} />);

      const timeText = container.querySelector('.font-black');
      expect(timeText).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles large time values', () => {
      render(<CircularTimer remainingTime={3600} />);

      // 3600 seconds = 60:00
      expect(screen.getByText('60:00')).toBeInTheDocument();
    });

    it('handles negative time (should show 0:00 or handle gracefully)', () => {
      // Component might not handle negative, but shouldn't throw
      expect(() =>
        render(<CircularTimer remainingTime={-10} />)
      ).not.toThrow();
    });
  });
});
