import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WordWheelReleasePop from '../WordWheelReleasePop';

describe('WordWheelReleasePop', () => {
  it('shows nothing before a word is accepted', () => {
    const { container } = render(<WordWheelReleasePop pop={null} />);
    expect(container.querySelector('[data-testid="wheel-release-pop"]')).toBeNull();
  });

  it('pops the accepted word over the wheel with an expanding ring', () => {
    render(<WordWheelReleasePop pop={{ id: 1, word: 'HACKS' }} />);
    expect(screen.getByTestId('wheel-release-pop').textContent).toBe('HACKS');
    expect(screen.getByTestId('wheel-release-ring')).toBeTruthy();
  });

  it('is decorative and never takes pointer events from the letters', () => {
    render(<WordWheelReleasePop pop={{ id: 2, word: 'SAW' }} />);
    expect(screen.getByTestId('wheel-release-pop').getAttribute('class')).toContain('pointer-events-none');
    expect(screen.getByTestId('wheel-release-pop').getAttribute('aria-hidden')).toBe('true');
  });
});
