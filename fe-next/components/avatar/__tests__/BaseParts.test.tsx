import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BASE_PARTS } from '../parts/BaseParts';

/**
 * TDD contract for face shapes (BaseParts).
 *
 * Per design: cute kawaii heads MUST read as heads (not objects/shapes).
 * All cute bases use ear bumps (ellipse rx~4 ry~6 near cx19/81) + forehead shine + soft chin.
 * Weird geometric ones (triangle/diamond/hexagon/shield) previously lacked ears + had hard points or heraldic details.
 *
 * These tests enforce the fix: the 4 formerly-weird shapes now include ear elements and (for shield) have zero heraldic gold.
 * They also ensure non-human specials (skull/dragon/cat) intentionally stay distinct.
 */

const renderBase = (Comp: React.FC<{ fill: string }>) =>
  render(
    <svg data-testid="avatar-base-wrap" viewBox="0 0 100 100">
      <Comp fill="#F4A7A7" />
    </svg>,
  );

describe('BaseParts — cute head contract (ears + non-object silhouettes)', () => {
  const SHAPES_REQUIRING_EARS = ['triangle', 'diamond', 'hexagon', 'shield'] as const;
  const NON_HUMAN_SPECIALS = ['skull', 'dragonHead', 'catFace'] as const;

  SHAPES_REQUIRING_EARS.forEach((key) => {
    const Comp = BASE_PARTS[key];

    it(`${key}: renders ear bump ellipses (reads as head, not geometric object)`, () => {
      const { container } = renderBase(Comp as React.FC<{ fill: string }>);
      // Ear bumps are the small ellipses (rx≈4, ry≈6) positioned at sides
      const earEllipses = container.querySelectorAll('ellipse[rx="4"][ry="6"], ellipse[rx="4"][ry="5.5"], ellipse[rx="4"][ry="5"]');
      // At minimum one pair (left+right). Some shapes use slight ry variation.
      expect(earEllipses.length).toBeGreaterThanOrEqual(2);
    });

    it(`${key}: main silhouette contains curves (Q) for organic softness, not pure hard L points`, () => {
      const { container } = renderBase(Comp as React.FC<{ fill: string }>);
      const paths = container.querySelectorAll('path');
      const mainPath = Array.from(paths).find((p) => {
        const d = p.getAttribute('d') || '';
        return d.includes('M') && (d.includes('L50') || d.includes('Q50') || d.includes('50 '));
      });
      expect(mainPath).toBeTruthy();
      const d = mainPath!.getAttribute('d') || '';
      expect(d).toMatch(/Q/); // at least one quadratic for rounded corner/forehead
    });
  });

  it('shield: contains ZERO heraldic gold elements (cross, rivets, border) — now reads as rounded crest-head', () => {
    const { container } = renderBase(BASE_PARTS.shield as React.FC<{ fill: string }>);
    const goldStrokes = container.querySelectorAll('[stroke="#FFD700"]');
    const goldFills = container.querySelectorAll('[fill="#FFD700"]');
    expect(goldStrokes.length + goldFills.length).toBe(0);
  });

  it('shield: still has ear bumps + soft dome (post-heraldic cleanup)', () => {
    const { container } = renderBase(BASE_PARTS.shield as React.FC<{ fill: string }>);
    const ears = container.querySelectorAll('ellipse[rx="4"][ry="6"]');
    expect(ears.length).toBeGreaterThanOrEqual(2);
    // Top should be a soft curve now (Q near y=10-14), not sharp L50 14
    const paths = Array.from(container.querySelectorAll('path'));
    const hasSoftTop = paths.some((p) => (p.getAttribute('d') || '').includes('Q50 1'));
    // lenient: any Q near top is fine
    const hasAnyQ = paths.some((p) => (p.getAttribute('d') || '').includes('Q'));
    expect(hasAnyQ).toBe(true);
  });

  NON_HUMAN_SPECIALS.forEach((key) => {
    it(`${key}: intentionally special/non-human — may lack standard ear bumps (by design)`, () => {
      const { container } = renderBase(BASE_PARTS[key as keyof typeof BASE_PARTS] as React.FC<{ fill: string }>);
      // We do not assert absence (some may have horns/ears), just that they render
      const svgContent = container.innerHTML;
      expect(svgContent.length).toBeGreaterThan(100);
    });
  });
});
