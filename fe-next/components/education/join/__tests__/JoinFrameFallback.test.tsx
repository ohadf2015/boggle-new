import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { JoinFrameFallback } from '../JoinFrameFallback';

describe('<JoinFrameFallback>', () => {
  it('holds exactly one viewport of navy, never a growing page', () => {
    render(<JoinFrameFallback />);
    const frame = screen.getByTestId('join-frame-fallback');
    expect(frame.className).toMatch(/(^|\s)h-dvh(\s|$)/);
    expect(frame.className).not.toContain('min-h-dvh');
    expect(frame.className).toContain('bg-neo-navy');
  });
});
