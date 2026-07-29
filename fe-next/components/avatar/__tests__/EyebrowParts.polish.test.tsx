import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EYEBROW_PARTS } from '../parts/EyebrowParts';

/**
 * Eyebrow baseline polish: every non-null brow must render at least one
 * gradient def and reference it from a stroke so brows read as hair fibres
 * with shine, not flat paint strokes.
 */
const EXCLUDED = new Set(['none']);

const renderBrow = (Comp: React.FC<{ fill: string }>) =>
  render(
    <svg viewBox="0 0 100 100">
      <Comp fill="#3B2F2F" />
    </svg>,
  );

describe('eyebrow baseline polish contract', () => {
  Object.entries(EYEBROW_PARTS)
    .filter(([k]) => !EXCLUDED.has(k))
    .forEach(([key, Comp]) => {
      it(`${key}: emits a gradient def`, () => {
        const { container } = renderBrow(Comp as React.FC<{ fill: string }>);
        const grads = container.querySelectorAll('linearGradient, radialGradient');
        expect(grads.length).toBeGreaterThan(0);
      });

      it(`${key}: gradient is referenced`, () => {
        const { container } = renderBrow(Comp as React.FC<{ fill: string }>);
        const refs = container.innerHTML.match(/url\(#[^)]*\)/g) || [];
        expect(refs.length).toBeGreaterThan(0);
      });
    });
});
