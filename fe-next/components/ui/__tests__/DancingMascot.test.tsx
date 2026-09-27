import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DancingMascot } from '../DancingMascot';
import { pickDanceLoop } from '@/lib/playerStyle/danceLoops';

describe('DancingMascot', () => {
  it('renders the deterministic loop for the given seed (no hydration drift)', () => {
    render(<DancingMascot seed={5} />);
    const img = screen.getByTestId('dancing-mascot');
    expect(img).toHaveAttribute('src', pickDanceLoop(5).src);
  });

  it('lets an explicit src override the seed pick', () => {
    render(<DancingMascot seed={5} src="/mascots/styles/k_pop.webp" />);
    expect(screen.getByTestId('dancing-mascot')).toHaveAttribute(
      'src',
      '/mascots/styles/k_pop.webp',
    );
  });

  it('is decorative by default (empty alt) but accepts an explicit label', () => {
    const { rerender } = render(<DancingMascot seed={1} />);
    expect(screen.getByTestId('dancing-mascot')).toHaveAttribute('alt', '');
    rerender(<DancingMascot seed={1} alt="Loading" />);
    expect(screen.getByTestId('dancing-mascot')).toHaveAttribute('alt', 'Loading');
  });

  it('forwards sizing className to the image', () => {
    render(<DancingMascot seed={1} className="w-24 h-24" />);
    expect(screen.getByTestId('dancing-mascot').className).toContain('w-24');
  });

  it('defaults to a valid loop when no seed is given', () => {
    render(<DancingMascot />);
    const src = screen.getByTestId('dancing-mascot').getAttribute('src');
    expect(src).toMatch(/^\/mascots\/styles\/.+\.(gif|webp)$/);
  });
});
