/**
 * VictoryCinematic Component Tests
 *
 * Tests for the level victory Remotion composition.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
 
import * as remotion from 'remotion';

beforeEach(() => {
  remotion.useCurrentFrame.mockReturnValue(90);
  remotion.useVideoConfig.mockReturnValue({ fps: 30, width: 1280, height: 720, durationInFrames: 180 });
  remotion.spring.mockReturnValue(1);
});

import { VictoryCinematic, VICTORY_DURATION_FRAMES } from '../VictoryCinematic';

describe('VictoryCinematic', () => {
  const defaultProps = {
    starsEarned: 3,
    wordsFound: 25,
    finalScore: 1500,
    timeRemaining: 45,
  };

  describe('rendering', () => {
    it('should render the composition container', () => {
      render(<VictoryCinematic {...defaultProps} />);

      const fills = screen.getAllByTestId('absolute-fill');
      expect(fills.length).toBeGreaterThan(0);
    });

    it('should render victory title text', () => {
      render(<VictoryCinematic {...defaultProps} />);

      expect(screen.getByText(/victory/i)).toBeInTheDocument();
    });

    it('should display stars earned', () => {
      render(<VictoryCinematic {...defaultProps} />);

      // Should show 3 stars
      const starsText = screen.getByText(/3/);
      expect(starsText).toBeInTheDocument();
    });

    it('should display stats (words found, score)', () => {
      render(<VictoryCinematic {...defaultProps} />);

      expect(screen.getByText(/25/)).toBeInTheDocument(); // Words
      expect(screen.getByText(/1500/)).toBeInTheDocument(); // Score
    });
  });

  describe('sequences', () => {
    it('should render multiple sequences for animation phases', () => {
      render(<VictoryCinematic {...defaultProps} />);

      const sequences = screen.getAllByTestId('sequence');
      // Should have at least 3 sequences (title burst, stars, stats)
      expect(sequences.length).toBeGreaterThanOrEqual(3);
    });

    it('should have sequences starting at different times', () => {
      render(<VictoryCinematic {...defaultProps} />);

      const sequences = screen.getAllByTestId('sequence');
      const startTimes = sequences.map((s) =>
        parseInt(s.getAttribute('data-from') || '0', 10)
      );

      // Sequences should have different start times
      const uniqueTimes = new Set(startTimes);
      expect(uniqueTimes.size).toBeGreaterThan(1);
    });
  });

  describe('star variations', () => {
    it('should render 1 star', () => {
      render(<VictoryCinematic {...defaultProps} starsEarned={1} />);

      expect(screen.getByText(/1 \/ 3 Stars/)).toBeInTheDocument();
    });

    it('should render 2 stars', () => {
      render(<VictoryCinematic {...defaultProps} starsEarned={2} />);

      expect(screen.getByText(/2 \/ 3 Stars/)).toBeInTheDocument();
    });

    it('should render 3 stars', () => {
      render(<VictoryCinematic {...defaultProps} starsEarned={3} />);

      expect(screen.getByText(/3 \/ 3 Stars/)).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should use victory colors (yellow/gold)', () => {
      const { container } = render(<VictoryCinematic {...defaultProps} />);

      // Should contain gold/yellow colors
      const html = container.innerHTML;
      expect(
        html.includes('#FFE135') || html.includes('#FFD700') || html.includes('gold')
      ).toBe(true);
    });
  });

  describe('constants', () => {
    it('should export correct duration (6 seconds)', () => {
      expect(VICTORY_DURATION_FRAMES).toBe(180); // 6 seconds at 30fps
    });
  });
});
