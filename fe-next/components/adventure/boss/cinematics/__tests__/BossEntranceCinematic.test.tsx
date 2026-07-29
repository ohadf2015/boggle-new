/**
 * BossEntranceCinematic Component Tests
 *
 * Tests for the boss entrance Remotion composition.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
 
import * as remotion from 'remotion';

beforeEach(() => {
  remotion.useCurrentFrame.mockReturnValue(120);
  remotion.useVideoConfig.mockReturnValue({ fps: 30, width: 1280, height: 720, durationInFrames: 240 });
  remotion.spring.mockReturnValue(1);
  remotion.staticFile.mockImplementation((path: string) => `/static/${path}`);
});

import { BossEntranceCinematic, ENTRANCE_DURATION_FRAMES } from '../BossEntranceCinematic';

describe('BossEntranceCinematic', () => {
  const defaultProps = {
    bossName: 'Ms. Grammar',
    bossImagePath: '/images/bosses/boss-ms-grammar.webp',
  };

  describe('rendering', () => {
    it('should render the composition container', () => {
      render(<BossEntranceCinematic {...defaultProps} />);

      // There are multiple AbsoluteFill elements (main container + lightning flashes)
      const fills = screen.getAllByTestId('absolute-fill');
      expect(fills.length).toBeGreaterThan(0);
    });

    it('should render boss name', () => {
      render(<BossEntranceCinematic {...defaultProps} />);

      expect(screen.getByText('Ms. Grammar')).toBeInTheDocument();
    });

    it('should render boss title when provided', () => {
      render(
        <BossEntranceCinematic
          {...defaultProps}
          bossTitle="Guardian of Knowledge"
        />
      );

      expect(screen.getByText('Guardian of Knowledge')).toBeInTheDocument();
    });

    it('should not render boss title when not provided', () => {
      render(<BossEntranceCinematic {...defaultProps} />);

      // The title paragraph should not exist
      expect(screen.queryByText('Guardian')).not.toBeInTheDocument();
    });

    it('should render world indicator', () => {
      render(
        <BossEntranceCinematic {...defaultProps} worldNumber={5} />
      );

      expect(screen.getByText('WORLD 5')).toBeInTheDocument();
    });

    it('should default to world 1', () => {
      render(<BossEntranceCinematic {...defaultProps} />);

      expect(screen.getByText('WORLD 1')).toBeInTheDocument();
    });
  });

  describe('images', () => {
    it('should render boss image with correct src', () => {
      render(<BossEntranceCinematic {...defaultProps} />);

      const images = screen.getAllByTestId('remotion-img');
      expect(images.length).toBeGreaterThan(0);
      // Check that one of the images has the expected path
      const hasCorrectPath = images.some((img) =>
        img.getAttribute('src')?.includes('boss-ms-grammar')
      );
      expect(hasCorrectPath).toBe(true);
    });

    it('should handle absolute path', () => {
      render(
        <BossEntranceCinematic
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
        <BossEntranceCinematic
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
      render(<BossEntranceCinematic {...defaultProps} />);

      const sequences = screen.getAllByTestId('sequence');
      expect(sequences.length).toBeGreaterThan(3); // Lightning, silhouette, reveal, title, etc.
    });

    it('should have sequence starting from frame 0 area', () => {
      render(<BossEntranceCinematic {...defaultProps} />);

      const sequences = screen.getAllByTestId('sequence');
      // Check that we have some early sequences (lightning effects)
      const earlySequences = sequences.filter(
        (s) => parseInt(s.getAttribute('data-from') || '999', 10) < 50
      );
      expect(earlySequences.length).toBeGreaterThan(0);
    });
  });

  describe('styling', () => {
    it('should apply custom primary color', () => {
      const { container } = render(
        <BossEntranceCinematic
          {...defaultProps}
          primaryColor="#FF6B35"
        />
      );

      // The color should be used somewhere in the styling
      expect(container.innerHTML).toContain('#FF6B35');
    });

    it('should use default primary color (yellow)', () => {
      const { container } = render(
        <BossEntranceCinematic {...defaultProps} />
      );

      // Default color #FFE135 should be used
      expect(container.innerHTML).toContain('#FFE135');
    });
  });

  describe('constants', () => {
    it('should export correct duration', () => {
      expect(ENTRANCE_DURATION_FRAMES).toBe(240); // 8 seconds at 30fps
    });
  });
});
