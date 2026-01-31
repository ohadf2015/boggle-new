/**
 * BossEntranceCinematic Component Tests
 *
 * Tests for the boss entrance Remotion composition.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock Remotion hooks and components
jest.mock('remotion', () => ({
  AbsoluteFill: ({ children, style }: React.PropsWithChildren<{ style?: React.CSSProperties }>) => (
    <div data-testid="absolute-fill" style={style}>
      {children}
    </div>
  ),
  Sequence: ({
    children,
    from,
    durationInFrames,
  }: React.PropsWithChildren<{ from: number; durationInFrames?: number }>) => (
    <div data-testid="sequence" data-from={from} data-duration={durationInFrames}>
      {children}
    </div>
  ),
  Img: ({ src, style }: { src: string; style?: React.CSSProperties }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-testid="remotion-img" src={src} style={style} alt="Boss" />
  ),
  useCurrentFrame: () => 120, // Mid-animation frame
  useVideoConfig: () => ({
    fps: 30,
    width: 1280,
    height: 720,
    durationInFrames: 240,
  }),
  interpolate: (
    frame: number,
    inputRange: number[],
    outputRange: number[],
  ) => {
    // Simplified linear interpolation for testing
    const [inMin, inMax] = inputRange;
    const [outMin, outMax] = outputRange;
    const t = (frame - inMin) / (inMax - inMin);
    const clamped = Math.max(0, Math.min(1, t));
    return outMin + clamped * (outMax - outMin);
  },
  spring: () => 1, // Fully sprung for testing
  staticFile: (path: string) => `/static/${path}`,
}));

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
