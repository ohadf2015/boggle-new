/**
 * ConnectionQualityIndicator Component Tests
 *
 * Signal-bar indicator for connection quality.
 * Hidden when 'disconnected' (ConnectionBanner handles that) or 'excellent' (no clutter).
 * 3 bars fill based on quality: good=2, poor=1, critical=0 (flashing red).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({
      children,
      animate,
      initial,
      transition,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({
    children,
  }: React.PropsWithChildren<{ mode?: string }>) => <>{children}</>,
}));

import ConnectionQualityIndicator from '../ConnectionQualityIndicator';

describe('ConnectionQualityIndicator', () => {
  // Given-When-Then

  describe('hidden states', () => {
    it('renders nothing when quality is disconnected', () => {
      // Given a disconnected quality (ConnectionBanner handles this)
      const { container } = render(
        <ConnectionQualityIndicator quality="disconnected" averageRtt={0} />
      );

      // Then nothing is rendered
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when quality is excellent', () => {
      // Given excellent quality — no need to clutter UI
      const { container } = render(
        <ConnectionQualityIndicator quality="excellent" averageRtt={25} />
      );

      // Then nothing is rendered
      expect(container.firstChild).toBeNull();
    });
  });

  describe('bar fill levels', () => {
    it('renders 2 filled bars for good quality', () => {
      // Given good quality
      render(
        <ConnectionQualityIndicator quality="good" averageRtt={80} />
      );

      // Then 3 bars exist, 2 filled
      const bars = screen.getAllByTestId(/^signal-bar-/);
      expect(bars).toHaveLength(3);

      const filledBars = bars.filter((bar) =>
        bar.getAttribute('data-filled') === 'true'
      );
      expect(filledBars).toHaveLength(2);
    });

    it('renders 1 filled bar for poor quality', () => {
      // Given poor quality
      render(
        <ConnectionQualityIndicator quality="poor" averageRtt={200} />
      );

      // Then 3 bars exist, 1 filled
      const bars = screen.getAllByTestId(/^signal-bar-/);
      expect(bars).toHaveLength(3);

      const filledBars = bars.filter((bar) =>
        bar.getAttribute('data-filled') === 'true'
      );
      expect(filledBars).toHaveLength(1);
    });

    it('renders 0 filled bars for critical quality', () => {
      // Given critical quality
      render(
        <ConnectionQualityIndicator quality="critical" averageRtt={500} />
      );

      // Then 3 bars exist, 0 filled
      const bars = screen.getAllByTestId(/^signal-bar-/);
      expect(bars).toHaveLength(3);

      const filledBars = bars.filter((bar) =>
        bar.getAttribute('data-filled') === 'true'
      );
      expect(filledBars).toHaveLength(0);
    });
  });

  describe('accessibility', () => {
    it('shows RTT value in aria-label', () => {
      // Given poor quality with known RTT
      render(
        <ConnectionQualityIndicator quality="poor" averageRtt={150} />
      );

      // Then aria-label includes RTT
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('150')
      );
    });

    it('has correct aria-label describing connection quality', () => {
      // Given good quality
      render(
        <ConnectionQualityIndicator quality="good" averageRtt={80} />
      );

      // Then aria-label describes the quality level
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('good')
      );
    });
  });

  describe('className prop', () => {
    it('applies custom className', () => {
      // Given a custom class
      render(
        <ConnectionQualityIndicator
          quality="poor"
          averageRtt={200}
          className="ml-2 opacity-80"
        />
      );

      // Then the root element includes the custom class
      const indicator = screen.getByRole('status');
      expect(indicator.className).toContain('ml-2');
      expect(indicator.className).toContain('opacity-80');
    });
  });
});
