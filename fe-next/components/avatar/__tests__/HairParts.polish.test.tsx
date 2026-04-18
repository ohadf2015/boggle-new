import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HAIR_PARTS } from '../parts/HairParts';

/**
 * Baseline hair polish: every non-null hair style (free + paid) should emit
 * at least one gradient def so that no style looks flat. VIP/Epic tier keeps
 * extra specialty accents on top (covered by HairParts.vip.test.tsx +
 * implicit through Epic's flame/galaxy/neon gradients).
 *
 * Excludes 'none' (null renderer — intentional) and pure dot-fade styles
 * where gradients don't apply (tracked separately).
 */
const EXCLUDED = new Set(['none']);

const renderHair = (Comp: React.FC<{ fill: string }>) =>
  render(
    <svg data-testid="wrap" viewBox="0 0 100 100">
      <Comp fill="#8B4513" />
    </svg>,
  );

describe('hair baseline polish contract', () => {
  Object.entries(HAIR_PARTS)
    .filter(([k]) => !EXCLUDED.has(k))
    .forEach(([key, Comp]) => {
      it(`${key}: emits a gradient def (baseline polish)`, () => {
        const { container } = renderHair(Comp as React.FC<{ fill: string }>);
        const grads = container.querySelectorAll('linearGradient, radialGradient');
        expect(grads.length).toBeGreaterThan(0);
      });

      it(`${key}: gradient is referenced by a shape (polish actually applied)`, () => {
        const { container } = renderHair(Comp as React.FC<{ fill: string }>);
        const html = container.innerHTML;
        const refs = html.match(/url\(#[^)]*\)/g) || [];
        expect(refs.length).toBeGreaterThan(0);
      });
    });
});
