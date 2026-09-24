import { describe, expect, it } from 'vitest';
import { PERFECT_RATIO, classifyLanding, perfectHalfWidth, perkMadePerfect } from '../landing';

const below = { x: 0, topY: -100, widthPx: 150 };

describe('classifyLanding', () => {
  it('given a block centred and level on the one below, when classified, then perfect', () => {
    expect(classifyLanding({ x: 2, bottomY: -100, angleRad: 0.01 }, below)).toBe('perfect');
  });

  it('given a small offset, when classified, then good', () => {
    expect(classifyLanding({ x: 25, bottomY: -100, angleRad: 0 }, below)).toBe('good');
  });

  it('given a large overhang, when classified, then sloppy', () => {
    expect(classifyLanding({ x: -60, bottomY: -100, angleRad: 0 }, below)).toBe('sloppy');
  });

  it('given a centred block that settled visibly tilted, when classified, then not perfect', () => {
    // Physics decides: a block rocking onto a corner is not a clean drop even if
    // its centre happens to line up.
    expect(classifyLanding({ x: 0, bottomY: -100, angleRad: 0.2 }, below)).not.toBe('perfect');
  });

  it('given a block that came to rest below the previous top, when classified, then miss', () => {
    expect(classifyLanding({ x: 200, bottomY: 0, angleRad: 0 }, below)).toBe('miss');
  });

  it('given no block below (first drop onto the ground), when classified, then judged against the ground centre', () => {
    expect(classifyLanding({ x: 0, bottomY: 0, angleRad: 0 }, null)).toBe('perfect');
    expect(classifyLanding({ x: 120, bottomY: 0, angleRad: 0 }, null)).toBe('sloppy');
  });
});

describe('perfectHalfWidth — the band drawn on the tower is the band the judge uses', () => {
  it('given no perk, when drawn, then it is the plain perfect ratio of the support half-width', () => {
    expect(perfectHalfWidth(200, 1)).toBeCloseTo(PERFECT_RATIO * 100, 6);
  });

  it('given the Crane Yard perk, when drawn, then the band widens by exactly the judge multiplier', () => {
    const w = perfectHalfWidth(200, 1.2);
    // Edge cases: just inside the drawn band is perfect, just outside is not.
    const support = { x: 0, topY: 0, widthPx: 200 };
    expect(classifyLanding({ x: w - 0.01, bottomY: 0, angleRad: 0 }, support, 1.2)).toBe('perfect');
    expect(classifyLanding({ x: w + 0.01, bottomY: 0, angleRad: 0 }, support, 1.2)).not.toBe('perfect');
  });
});

describe('perkMadePerfect — the Crane Yard upgrade earns a visible moment', () => {
  const support = { x: 0, topY: 0, widthPx: 200 };
  const at = (x: number) => ({ x, bottomY: 0, angleRad: 0 });

  it('given a landing inside the plain band, when judged, then the perk gets no credit (it was perfect anyway)', () => {
    expect(perkMadePerfect(at(1), support, 1.2)).toBe(false);
  });

  it('given a landing only the widened band covers, when judged, then the perk made it perfect', () => {
    const plainEdge = perfectHalfWidth(200, 1);
    expect(perkMadePerfect(at(plainEdge + 0.5), support, 1.2)).toBe(true);
  });

  it('given no perk, when judged, then it never claims credit', () => {
    expect(perkMadePerfect(at(perfectHalfWidth(200, 1) + 0.5), support, 1)).toBe(false);
  });
});
