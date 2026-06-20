import { describe, it, expect } from 'vitest';
import { serializeAvatarSvg } from '../rasterizeAvatar';

/**
 * Build a minimal stand-in for the AvatarRenderer DOM output: one root <svg>
 * with primitives + a baked blink <animate> (which must be stripped for a
 * static raster snapshot).
 */
function makeSvgEl(): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  const circle = document.createElementNS(NS, 'circle');
  circle.setAttribute('cx', '50');
  circle.setAttribute('cy', '52');
  circle.setAttribute('r', '40');
  const animate = document.createElementNS(NS, 'animate');
  animate.setAttribute('attributeName', 'ry');
  circle.appendChild(animate);
  svg.appendChild(circle);
  return svg as SVGSVGElement;
}

describe('serializeAvatarSvg', () => {
  it('adds the SVG xmlns so the markup is standalone-parseable', () => {
    const out = serializeAvatarSvg(makeSvgEl());
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('preserves the viewBox and primitive geometry', () => {
    const out = serializeAvatarSvg(makeSvgEl());
    expect(out).toContain('viewBox="0 0 100 100"');
    expect(out).toContain('<circle');
  });

  it('strips baked <animate> elements so the snapshot is static', () => {
    const out = serializeAvatarSvg(makeSvgEl());
    expect(out).not.toContain('<animate');
  });

  it('does not mutate the source element', () => {
    const el = makeSvgEl();
    serializeAvatarSvg(el);
    expect(el.querySelector('animate')).not.toBeNull();
  });
});
