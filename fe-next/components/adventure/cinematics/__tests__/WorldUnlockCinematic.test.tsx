import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('remotion', () => ({
  AbsoluteFill: ({ children, style, ...rest }: React.PropsWithChildren<{ style?: React.CSSProperties; 'data-testid'?: string }>) => (
    <div data-testid={rest['data-testid'] || 'absolute-fill'} style={style}>{children}</div>
  ),
  Sequence: ({ children, from }: React.PropsWithChildren<{ from: number }>) => (
    <div data-testid="sequence" data-from={from}>{children}</div>
  ),
  useCurrentFrame: () => 200,
  useVideoConfig: () => ({ fps: 30, width: 1280, height: 720, durationInFrames: 300 }),
  interpolate: (frame: number, inputRange: number[], outputRange: number[]) => {
    const [inMin, inMax] = inputRange;
    const [outMin, outMax] = outputRange;
    const t = Math.max(0, Math.min(1, (frame - inMin) / (inMax - inMin)));
    return outMin + t * (outMax - outMin);
  },
  spring: () => 1,
}));

jest.mock('../../../../lib/remotion/fonts', () => ({
  fredokaFamily: 'Fredoka, sans-serif',
  rubikFamily: 'Rubik, sans-serif',
}));

import { WorldUnlockCinematic, WORLD_UNLOCK_DURATION_FRAMES } from '../WorldUnlockCinematic';

describe('WorldUnlockCinematic', () => {
  const defaultProps = {
    previousWorldNumber: 1,
    previousWorldName: 'Beginner Plains',
    newWorldNumber: 2,
    newWorldName: 'Crystal Caverns',
    previousColor: '#FFE135',
    newColor: '#00FFFF',
  };

  it('should render the composition', () => {
    render(<WorldUnlockCinematic {...defaultProps} />);
    expect(screen.getAllByTestId('absolute-fill').length).toBeGreaterThan(0);
  });

  it('should display new world name', () => {
    render(<WorldUnlockCinematic {...defaultProps} />);
    expect(screen.getByText('Crystal Caverns')).toBeInTheDocument();
  });

  it('should display world number', () => {
    render(<WorldUnlockCinematic {...defaultProps} />);
    expect(screen.getByText('WORLD 2')).toBeInTheDocument();
  });

  it('should render world emoji when provided', () => {
    render(<WorldUnlockCinematic {...defaultProps} worldEmoji="💎" />);
    expect(screen.getByText('💎')).toBeInTheDocument();
  });

  it('should render chapter names when provided', () => {
    render(
      <WorldUnlockCinematic
        {...defaultProps}
        chapterNames={['Level 1: The Gate', 'Level 2: The Depths']}
      />
    );
    expect(screen.getByText('Level 1: The Gate')).toBeInTheDocument();
    expect(screen.getByText('Level 2: The Depths')).toBeInTheDocument();
  });

  it('should use custom unlock text', () => {
    render(<WorldUnlockCinematic {...defaultProps} unlockText="NUEVO MUNDO!" />);
    expect(screen.getByText('NUEVO MUNDO!')).toBeInTheDocument();
  });

  it('should export correct duration', () => {
    expect(WORLD_UNLOCK_DURATION_FRAMES).toBe(300);
  });

  it('should render multiple sequences', () => {
    render(<WorldUnlockCinematic {...defaultProps} />);
    const sequences = screen.getAllByTestId('sequence');
    expect(sequences.length).toBeGreaterThan(3);
  });
});
