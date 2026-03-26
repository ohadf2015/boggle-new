/**
 * DefeatCinematic Component Tests
 *
 * Tests for the level defeat Remotion composition.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
 
import * as remotion from 'remotion';

beforeEach(() => {
  remotion.useCurrentFrame.mockReturnValue(75);
  remotion.useVideoConfig.mockReturnValue({ fps: 30, width: 1280, height: 720, durationInFrames: 150 });
  remotion.spring.mockReturnValue(1);
});

import { DefeatCinematic, DEFEAT_DURATION_FRAMES } from '../DefeatCinematic';

describe('DefeatCinematic', () => {
  const defaultProps = {
    wordsFound: 15,
    bestWord: 'QUIZZICAL',
    finalScore: 850,
  };

  describe('rendering', () => {
    it('should render the composition container', () => {
      render(<DefeatCinematic {...defaultProps} />);

      const fills = screen.getAllByTestId('absolute-fill');
      expect(fills.length).toBeGreaterThan(0);
    });

    it('should render defeat message (encouraging tone)', () => {
      render(<DefeatCinematic {...defaultProps} />);

      // Should NOT say "defeat" or negative words
      expect(screen.queryByText(/defeat/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/lose/i)).not.toBeInTheDocument();

      // Should have encouraging message
      const encouragingText = screen.getAllByText(/time|almost|nice|try|great/i);
      expect(encouragingText.length).toBeGreaterThan(0);
    });

    it('should display words found', () => {
      render(<DefeatCinematic {...defaultProps} />);

      expect(screen.getByText(/15/)).toBeInTheDocument();
    });

    it('should display best word', () => {
      render(<DefeatCinematic {...defaultProps} />);

      expect(screen.getByText(/QUIZZICAL/i)).toBeInTheDocument();
    });

    it('should display final score', () => {
      render(<DefeatCinematic {...defaultProps} />);

      expect(screen.getByText(/850/)).toBeInTheDocument();
    });
  });

  describe('sequences', () => {
    it('should render multiple sequences for animation phases', () => {
      render(<DefeatCinematic {...defaultProps} />);

      const sequences = screen.getAllByTestId('sequence');
      // Should have at least 3 sequences (title, message, stats)
      expect(sequences.length).toBeGreaterThanOrEqual(3);
    });

    it('should have sequences starting at different times', () => {
      render(<DefeatCinematic {...defaultProps} />);

      const sequences = screen.getAllByTestId('sequence');
      const startTimes = sequences.map((s) =>
        parseInt(s.getAttribute('data-from') || '0', 10)
      );

      // Sequences should have different start times
      const uniqueTimes = new Set(startTimes);
      expect(uniqueTimes.size).toBeGreaterThan(1);
    });
  });

  describe('tone', () => {
    it('should use encouraging colors (not red/harsh)', () => {
      const { container } = render(<DefeatCinematic {...defaultProps} />);

      // Should avoid pure red/harsh colors (#FF0000, #F00, rgb(255, 0, 0))
      const html = container.innerHTML;
      expect(html.includes('#FF0000') || html.includes('#F00') || html.includes('rgb(255, 0, 0)')).toBe(false);

      // Should use softer colors (yellow, orange, cyan)
      expect(
        html.includes('#FFE135') ||
        html.includes('#FF6B35') ||
        html.includes('#00FFFF')
      ).toBe(true);
    });
  });

  describe('constants', () => {
    it('should export correct duration (5 seconds)', () => {
      expect(DEFEAT_DURATION_FRAMES).toBe(150); // 5 seconds at 30fps
    });
  });
});
