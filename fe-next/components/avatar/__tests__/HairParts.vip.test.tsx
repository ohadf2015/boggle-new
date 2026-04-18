import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HAIR_PARTS } from '../parts/HairParts';

/**
 * VIP hair tier-polish contract:
 * Each PREMIUM hair must emit (a) shared HairPolishDefs shade+light
 * gradients AND (b) a specialty accent gradient unique to the style
 * (gloss/tail/pop/sheen/bun/shine/etc). Minimum 3 gradient defs.
 * Prevents tier-ladder collapse once free tier adopts HairPolishDefs.
 */
const VIP_STYLES = ['elvis', 'ramen', 'twintails', 'undercut', 'spaceBuns', 'fadeCurly'] as const;

const renderHair = (Comp: React.FC<{ fill: string }>) =>
  render(
    <svg data-testid="wrap" viewBox="0 0 100 100">
      <Comp fill="#8B4513" />
    </svg>,
  );

describe('VIP hair parts polish contract', () => {
  VIP_STYLES.forEach((key) => {
    it(`${key}: emits shared + specialty gradients (>=3 defs)`, () => {
      const Comp = HAIR_PARTS[key as keyof typeof HAIR_PARTS] as React.FC<{ fill: string }>;
      const { container } = renderHair(Comp);
      const grads = container.querySelectorAll('linearGradient, radialGradient');
      expect(grads.length).toBeGreaterThanOrEqual(3);
    });

    it(`${key}: has specialty gradient id distinct from shared shade/light`, () => {
      const Comp = HAIR_PARTS[key as keyof typeof HAIR_PARTS] as React.FC<{ fill: string }>;
      const { container } = renderHair(Comp);
      const ids = Array.from(
        container.querySelectorAll('linearGradient, radialGradient'),
      ).map((g) => g.getAttribute('id') || '');
      const specialty = ids.filter((id) => !/-(shade|light)$/.test(id));
      expect(specialty.length).toBeGreaterThan(0);
    });

    it(`${key}: gradient contains at least two stops`, () => {
      const Comp = HAIR_PARTS[key as keyof typeof HAIR_PARTS] as React.FC<{ fill: string }>;
      const { container } = renderHair(Comp);
      const stops = container.querySelectorAll('linearGradient stop, radialGradient stop');
      expect(stops.length).toBeGreaterThanOrEqual(2);
    });
  });
});
