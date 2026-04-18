import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FACIAL_HAIR_PARTS } from '../parts/FacialHairParts';

/**
 * TrimmedBeard polish contract: silhouette must render with at least one
 * gradient def and reference it from a shape so the beard reads as dimensional
 * stubble, not a flat color swatch.
 */
describe('trimmed beard polish contract', () => {
  const TrimmedBeard = FACIAL_HAIR_PARTS.trimmedBeard as React.FC<{ fill: string }>;

  it('emits a gradient def', () => {
    const { container } = render(
      <svg data-testid="wrap" viewBox="0 0 100 100">
        <TrimmedBeard fill="#3a2a1a" />
      </svg>,
    );
    const grads = container.querySelectorAll('linearGradient, radialGradient');
    expect(grads.length).toBeGreaterThan(0);
  });

  it('references a gradient from a shape', () => {
    const { container } = render(
      <svg viewBox="0 0 100 100">
        <TrimmedBeard fill="#3a2a1a" />
      </svg>,
    );
    const refs = container.innerHTML.match(/url\(#[^)]*\)/g) || [];
    expect(refs.length).toBeGreaterThan(0);
  });
});
