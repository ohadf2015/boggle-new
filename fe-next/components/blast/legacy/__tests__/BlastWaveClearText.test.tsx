/**
 * Tests for BlastWaveClearText — perfect wave bonus celebration.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastWaveClearText, getWaveClearTier } from '../BlastWaveClearText';

// Mock AdaptiveMotion to render children directly
jest.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: (props: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>) => <div {...props} />,
    span: (props: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>) => <span {...props} />,
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('getWaveClearTier', () => {
  it('returns PERFECT for 5+ remaining moves', () => {
    expect(getWaveClearTier(5)).toEqual(expect.objectContaining({ text: 'PERFECT!' }));
    expect(getWaveClearTier(10)).toEqual(expect.objectContaining({ text: 'PERFECT!' }));
  });

  it('returns GREAT for 3-4 remaining moves', () => {
    expect(getWaveClearTier(3)).toEqual(expect.objectContaining({ text: 'GREAT!' }));
    expect(getWaveClearTier(4)).toEqual(expect.objectContaining({ text: 'GREAT!' }));
  });

  it('returns CLEAR for 1-2 remaining moves', () => {
    expect(getWaveClearTier(1)).toEqual(expect.objectContaining({ text: 'CLEAR!' }));
    expect(getWaveClearTier(2)).toEqual(expect.objectContaining({ text: 'CLEAR!' }));
  });

  it('returns CLEAR for 0 remaining moves (barely made it)', () => {
    expect(getWaveClearTier(0)).toEqual(expect.objectContaining({ text: 'CLEAR!' }));
  });
});

const mockT = (key: string) => {
  const map: Record<string, string> = {
    'blast.waveClear.perfect': 'PERFECT!',
    'blast.waveClear.great': 'GREAT!',
    'blast.waveClear.clear': 'CLEAR!',
  };
  return map[key];
};

describe('BlastWaveClearText', () => {
  it('renders tier text when waveCleared is true', () => {
    render(<BlastWaveClearText waveCleared movesRemaining={5} t={mockT} />);
    expect(screen.getByText('PERFECT!')).toBeInTheDocument();
  });

  it('renders GREAT for 3 remaining moves', () => {
    render(<BlastWaveClearText waveCleared movesRemaining={3} t={mockT} />);
    expect(screen.getByText('GREAT!')).toBeInTheDocument();
  });

  it('renders nothing when waveCleared is false', () => {
    const { container } = render(<BlastWaveClearText waveCleared={false} movesRemaining={5} t={mockT} />);
    expect(container.textContent).toBe('');
  });

  it('renders bonus moves text for PERFECT tier', () => {
    render(<BlastWaveClearText waveCleared movesRemaining={7} t={mockT} />);
    expect(screen.getByText('+35')).toBeInTheDocument(); // 7 * 5 bonus points
  });
});
