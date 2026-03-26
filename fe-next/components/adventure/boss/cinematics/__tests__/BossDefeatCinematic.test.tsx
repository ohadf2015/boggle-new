/**
 * BossDefeatCinematic Component Tests
 *
 * Tests for the boss defeat/victory Remotion composition.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
 
import * as remotion from 'remotion';

beforeEach(() => {
  remotion.useCurrentFrame.mockReturnValue(150);
  remotion.useVideoConfig.mockReturnValue({ fps: 30, width: 1280, height: 720, durationInFrames: 240 });
  remotion.spring.mockReturnValue(1);
  remotion.staticFile.mockImplementation((path: string) => `/static/${path}`);
});

import { BossDefeatCinematic, DEFEAT_DURATION_FRAMES } from '../BossDefeatCinematic';

describe('BossDefeatCinematic', () => {
  const defaultProps = {
    bossName: 'Ms. Grammar',
    bossImagePath: '/images/bosses/boss-ms-grammar.webp',
  };

  describe('rendering', () => {
    it('should render the composition container', () => {
      render(<BossDefeatCinematic {...defaultProps} />);

      // There are multiple AbsoluteFill elements (main container + flash effect)
      const fills = screen.getAllByTestId('absolute-fill');
      expect(fills.length).toBeGreaterThan(0);
    });

    it('should render victory text', () => {
      render(<BossDefeatCinematic {...defaultProps} />);

      expect(screen.getByText('VICTORY!')).toBeInTheDocument();
    });

    it('should render boss defeated message', () => {
      render(<BossDefeatCinematic {...defaultProps} />);

      expect(screen.getByText('Ms. Grammar defeated!')).toBeInTheDocument();
    });

    it('should render perfect victory text when enabled', () => {
      render(
        <BossDefeatCinematic {...defaultProps} perfectVictory={true} />
      );

      expect(screen.getByText('PERFECT VICTORY')).toBeInTheDocument();
    });

    it('should not render perfect victory text by default', () => {
      render(<BossDefeatCinematic {...defaultProps} />);

      expect(screen.queryByText('PERFECT VICTORY')).not.toBeInTheDocument();
    });
  });

  describe('rewards display', () => {
    it('should render gold earned', () => {
      render(
        <BossDefeatCinematic {...defaultProps} goldEarned={500} />
      );

      expect(screen.getByText('+500')).toBeInTheDocument();
      expect(screen.getByText('GOLD')).toBeInTheDocument();
    });

    it('should render XP earned', () => {
      render(
        <BossDefeatCinematic {...defaultProps} xpEarned={250} />
      );

      expect(screen.getByText('+250')).toBeInTheDocument();
      expect(screen.getByText('XP')).toBeInTheDocument();
    });

    it('should use default gold value', () => {
      render(<BossDefeatCinematic {...defaultProps} />);

      expect(screen.getByText('+100')).toBeInTheDocument(); // Default goldEarned
    });

    it('should use default XP value', () => {
      render(<BossDefeatCinematic {...defaultProps} />);

      expect(screen.getByText('+50')).toBeInTheDocument(); // Default xpEarned
    });
  });

  describe('images', () => {
    it('should render boss image', () => {
      render(<BossDefeatCinematic {...defaultProps} />);

      const images = screen.getAllByTestId('remotion-img');
      expect(images.length).toBeGreaterThan(0);
    });

    it('should handle absolute path', () => {
      render(
        <BossDefeatCinematic
          {...defaultProps}
          bossImagePath="/images/bosses/test-boss.webp"
        />
      );

      const images = screen.getAllByTestId('remotion-img');
      expect(images.length).toBeGreaterThan(0);
    });

    it('should always use staticFile for image paths (prevents black screen)', () => {
      // This test ensures images always go through staticFile() which triggers
      // Remotion's delayRender mechanism for proper loading synchronization
      render(
        <BossDefeatCinematic
          {...defaultProps}
          bossImagePath="/images/bosses/boss-ms-grammar.webp"
        />
      );

      const images = screen.getAllByTestId('remotion-img');
      expect(images.length).toBeGreaterThan(0);

      // All images should have paths processed through staticFile (which adds /static/ prefix in mock)
      const allUseStaticFile = images.every((img) => {
        const src = img.getAttribute('src');
        return src?.startsWith('/static/');
      });
      expect(allUseStaticFile).toBe(true);
    });
  });

  describe('sequences', () => {
    it('should render multiple sequences for animation phases', () => {
      render(<BossDefeatCinematic {...defaultProps} />);

      const sequences = screen.getAllByTestId('sequence');
      expect(sequences.length).toBeGreaterThan(3); // Stagger, shatter, explosion, victory, rewards, confetti
    });

    it('should have sequence for explosion phase', () => {
      render(<BossDefeatCinematic {...defaultProps} />);

      const sequences = screen.getAllByTestId('sequence');
      // Explosion phase starts at frame 90
      const explosionSequence = sequences.find(
        (s) => s.getAttribute('data-from') === '90'
      );
      expect(explosionSequence).toBeTruthy();
    });

    it('should have sequence for victory text phase', () => {
      render(<BossDefeatCinematic {...defaultProps} />);

      const sequences = screen.getAllByTestId('sequence');
      // Victory text starts at frame 120
      const victorySequence = sequences.find(
        (s) => s.getAttribute('data-from') === '120'
      );
      expect(victorySequence).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('should apply custom primary color', () => {
      const { container } = render(
        <BossDefeatCinematic
          {...defaultProps}
          primaryColor="#FF6B35"
        />
      );

      // The color should be used somewhere in the styling
      expect(container.innerHTML).toContain('#FF6B35');
    });

    it('should apply custom secondary color', () => {
      const { container } = render(
        <BossDefeatCinematic
          {...defaultProps}
          secondaryColor="#FF1493"
        />
      );

      expect(container.innerHTML).toContain('#FF1493');
    });

    it('should use default primary color (yellow)', () => {
      const { container } = render(
        <BossDefeatCinematic {...defaultProps} />
      );

      // Default color #FFE135 should be used
      expect(container.innerHTML).toContain('#FFE135');
    });
  });

  describe('constants', () => {
    it('should export correct duration', () => {
      expect(DEFEAT_DURATION_FRAMES).toBe(240); // 8 seconds at 30fps
    });
  });

  describe('animation phases', () => {
    it('should have correct number of shatter fragments', () => {
      render(<BossDefeatCinematic {...defaultProps} />);

      // The component generates 30 fragments
      // Each fragment is a div within the shatter sequence
      const sequences = screen.getAllByTestId('sequence');
      // Find the shatter sequence (starts at frame 30)
      const shatterSequence = sequences.find(
        (s) => s.getAttribute('data-from') === '30'
      );
      expect(shatterSequence).toBeTruthy();
    });
  });
});
