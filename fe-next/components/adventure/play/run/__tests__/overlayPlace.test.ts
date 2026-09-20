import { describe, it, expect } from 'vitest';
import { clampX, clampY, calloutSpot, trailRect, tooltipTop, type Rect } from '../overlayPlace';

const rect = (left: number, top: number, width = 40, height = 40): Rect => ({ left, top, width, height });
const phone = { width: 390, height: 844 };

describe('clampX — an overlay is whole at 390px or it is a bug', () => {
  it('Given room on both sides, then the box is centred on the anchor', () => {
    expect(clampX(195, 200, 390)).toBe(95);
  });

  it('Given an anchor hard against the start edge, then the box stops at the gutter', () => {
    expect(clampX(20, 200, 390)).toBe(8);
  });

  it('Given an anchor hard against the end edge, then the box stops at the far gutter', () => {
    expect(clampX(380, 200, 390)).toBe(182);
  });

  it('Given a box wider than the screen, then it still starts at the gutter, never negative', () => {
    expect(clampX(195, 600, 390)).toBe(8);
  });
});

describe('clampY', () => {
  it('Given the preferred top fits, then it is kept', () => {
    expect(clampY(300, 100, 844)).toBe(300);
  });

  it('Given the preferred top would run off the bottom, then it is pulled up', () => {
    expect(clampY(800, 100, 844)).toBe(736);
  });
});

describe('calloutSpot — the trigger callout parks under the rail it belongs to', () => {
  const box = { width: 200, height: 48 };

  it('Given a rail near the top, then the callout sits just under it', () => {
    const spot = calloutSpot(rect(10, 60, 300, 60), [rect(20, 70)], box, phone);
    expect(spot.top).toBe(126); // 60 + 60 + 6
    expect(spot.flipped).toBe(false);
  });

  it('Given one firing chip, then the callout centres on THAT chip, not the whole rail', () => {
    // A rail spanning 10..390 whose firing chip sits at 240..280: centre 260, box 200 → 160.
    const spot = calloutSpot(rect(10, 60, 372, 60), [rect(240, 70)], box, phone);
    expect(spot.left).toBe(160);
  });

  it('Given two firing chips, then the callout centres between them', () => {
    const spot = calloutSpot(rect(10, 60, 300, 60), [rect(20, 70), rect(120, 70)], box, phone);
    // centres 40 and 140 → mid 90 → 90 - 100 = -10 → pulled back to the rail's own edge.
    expect(spot.left).toBe(10);
  });

  it('Given a wide TV screen, then the callout stays inside the rail it belongs to', () => {
    // On a 1920px canvas the run bar is a narrow centred column. Centring the
    // panel on its chip pushed it out past the bar's left edge, where it read as
    // a stray label floating on the backdrop rather than part of the HUD.
    const tv = { width: 1920, height: 1080 };
    const spot = calloutSpot(rect(720, 80, 480, 70), [rect(735, 92)], box, tv);
    expect(spot.left).toBe(720);
  });

  it('Given a rail narrower than the callout, then the viewport is the only clamp', () => {
    const spot = calloutSpot(rect(150, 60, 90, 60), [rect(160, 70)], box, phone);
    expect(spot.left).toBe(80); // chip centre 180 − 100
  });

  it('Given a rail sitting low with room above, then the callout flips above it', () => {
    const spot = calloutSpot(rect(10, 780, 300, 50), [rect(20, 790)], box, phone);
    expect(spot.flipped).toBe(true);
    expect(spot.top).toBe(726); // 780 - 6 - 48
  });
});

describe('trailRect — the line that says WHICH relic did it', () => {
  const box = { width: 200, height: 48 };

  it('Given a callout below the chip, then the trail spans the gap under the chip', () => {
    const t = trailRect(rect(20, 70), { left: 10, top: 126, flipped: false }, box);
    expect(t).toEqual({ left: 40, top: 110, height: 16 });
  });

  it('Given a callout above the chip, then the trail spans the gap over the chip', () => {
    const t = trailRect(rect(20, 790), { left: 8, top: 726, flipped: true }, box);
    expect(t).toEqual({ left: 40, top: 774, height: 16 });
  });

  it('Given a callout that overlaps its chip, then there is no trail to draw', () => {
    expect(trailRect(rect(20, 70), { left: 8, top: 80, flipped: false }, box)).toBeNull();
  });
});

/**
 * ROUND 6 FLAG: "opening the relic tooltip fully covers the boss HP bar and the
 * attack countdown while the boss is winding up — a real problem given the
 * fight's mechanic is read the timer, spell the word before it lands."
 * The bubble now slides CLEAR of whatever it was told to protect.
 */
describe('tooltipTop — the bubble never sits on the boss panel', () => {
  const vp = { width: 390, height: 844 };
  const box = { width: 272, height: 150 };
  // A chip in the run bar, and the boss panel right under it.
  const chip = { left: 20, top: 96, width: 44, height: 44 };
  const boss = { left: 8, top: 150, width: 374, height: 190 };

  it('Given no panel to protect, then it parks just under the chip', () => {
    expect(tooltipTop(chip, box, vp)).toBe(chip.top + chip.height + 8);
  });

  it('Given the boss panel under the chip, then the bubble clears its bottom edge', () => {
    const top = tooltipTop(chip, box, vp, boss);
    expect(top).toBeGreaterThanOrEqual(boss.top + boss.height);
  });

  it('Given a protected panel it would not have touched anyway, then nothing moves', () => {
    const farBelow = { left: 8, top: 700, width: 374, height: 120 };
    expect(tooltipTop(chip, box, vp, farBelow)).toBe(tooltipTop(chip, box, vp));
  });

  it('Given a rail lower down and no room below the panel, then it goes ABOVE the chip', () => {
    const lowChip = { left: 20, top: 520, width: 44, height: 44 };
    const tall = { left: 8, top: 560, width: 374, height: 270 };
    const top = tooltipTop(lowChip, box, vp, tall);
    expect(top + box.height).toBeLessThanOrEqual(lowChip.top);
  });

  it('Given a bubble that fits nowhere clear, then it still stays on screen', () => {
    const everything = { left: 0, top: 0, width: 390, height: 844 };
    const top = tooltipTop(chip, box, vp, everything);
    expect(top).toBeGreaterThanOrEqual(8);
    expect(top + box.height).toBeLessThanOrEqual(vp.height - 8);
  });
});
