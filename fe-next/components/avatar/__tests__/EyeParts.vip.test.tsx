import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EYE_PARTS } from '../parts/EyeParts';

/**
 * VIP eyes polish contract (Laser, Hypno, Money, Alien, Cyclops).
 * Each must emit at least TWO gradient defs (depth + sheen) and reference
 * at least one from a shape, bringing them up to the Epic-tier visual floor
 * established by Galaxy / Flame / Void.
 */

const VIP_KEYS = ['laser', 'hypno', 'money', 'alien', 'cyclops'] as const;

const renderEye = (Comp: React.FC) =>
  render(
    <svg viewBox="0 0 100 100">
      <Comp />
    </svg>,
  );

describe('VIP eyes polish contract', () => {
  VIP_KEYS.forEach((key) => {
    it(`${key}: emits >=2 gradient defs`, () => {
      const { container } = renderEye(EYE_PARTS[key] as React.FC);
      const grads = container.querySelectorAll('linearGradient, radialGradient');
      expect(grads.length).toBeGreaterThanOrEqual(2);
    });

    it(`${key}: references a gradient from a shape`, () => {
      const { container } = renderEye(EYE_PARTS[key] as React.FC);
      const refs = container.innerHTML.match(/url\(#[^)]*\)/g) || [];
      expect(refs.length).toBeGreaterThan(0);
    });
  });
});
