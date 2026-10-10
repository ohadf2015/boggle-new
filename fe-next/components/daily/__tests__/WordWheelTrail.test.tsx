import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WordWheelTrail from '../WordWheelTrail';

describe('WordWheelTrail', () => {
  it('draws nothing while no letter is selected', () => {
    const { container } = render(<WordWheelTrail selectedIndices={[]} radius={100} />);
    const paths = container.querySelectorAll('path[data-trail-line]');
    expect(paths).toHaveLength(0);
  });

  it('draws the chain through the selected slots around the wheel centre', () => {
    const { container } = render(<WordWheelTrail selectedIndices={[-1, 0]} radius={100} />);
    const line = container.querySelector('path[data-trail-line]');
    expect(line?.getAttribute('d')).toBe('M0.0 0.0 L0.0 -100.0');
  });

  it('is decorative: aria-hidden and never takes pointer events from the letters', () => {
    const { getByTestId } = render(<WordWheelTrail selectedIndices={[0]} radius={100} />);
    const svg = getByTestId('word-wheel-trail');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('class')).toContain('pointer-events-none');
  });

  it('flags the invalid state so the trail can turn red', () => {
    const { getByTestId } = render(<WordWheelTrail selectedIndices={[0]} radius={100} invalid />);
    expect(getByTestId('word-wheel-trail').getAttribute('data-invalid')).toBe('true');
  });
});
