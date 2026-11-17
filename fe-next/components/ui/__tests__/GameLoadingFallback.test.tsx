import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameLoadingFallback } from '../GameLoadingFallback';

describe('GameLoadingFallback', () => {
  it('holds a full viewport so the game swapping in does not jump the layout', () => {
    const { container } = render(<GameLoadingFallback />);
    expect((container.firstChild as HTMLElement).className).toContain('min-h-[100svh]');
  });

  it('lets the body pattern show through: no background slab, no blurred backdrop', () => {
    const { container } = render(<GameLoadingFallback />);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/\bbg-/);
    expect(container.querySelectorAll('[data-testid="page-loader"]')).toHaveLength(1);
    expect(container.innerHTML).not.toMatch(/blur/);
  });

  it('passes the mode pose and caption through to the loader', () => {
    render(<GameLoadingFallback mascotVariant="spectating" text="Shuffling letters..." />);
    expect(screen.getByTestId('loader-mascot')).toHaveAttribute('src', '/mascot/popcorn-nobg.webp');
    expect(screen.getByText('Shuffling letters...')).toBeInTheDocument();
  });
});
