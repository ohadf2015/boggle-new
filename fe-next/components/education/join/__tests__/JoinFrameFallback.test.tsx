import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { JoinFrameFallback } from '../JoinFrameFallback';

describe('<JoinFrameFallback>', () => {
  it('holds exactly one viewport, never a growing page', () => {
    render(<JoinFrameFallback />);
    const frame = screen.getByTestId('join-frame-fallback');
    expect(frame.className).toMatch(/(^|\s)h-dvh(\s|$)/);
    expect(frame.className).not.toContain('min-h-dvh');
  });

  it('shows the loader over the page pattern instead of a blank navy screen', () => {
    render(<JoinFrameFallback />);
    const frame = screen.getByTestId('join-frame-fallback');
    expect(frame.className).not.toMatch(/\bbg-/);
    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });
});
