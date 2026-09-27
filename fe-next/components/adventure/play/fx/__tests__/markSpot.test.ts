import { countTween, markSpot } from '../markSpot';

describe('markSpot', () => {
  it('given a target rect, then the sticker sits centred on its lower edge (on the portrait, clear of the HP readout beside it)', () => {
    const s = markSpot({ left: 20, top: 90, width: 92, height: 92 }, 390);
    expect(s.x).toBe(66);
    expect(s.y).toBeGreaterThan(90 + 46);
    expect(s.y).toBeLessThanOrEqual(90 + 92);
  });
  it('given a target hugging the screen edge, then the sticker stays on screen', () => {
    expect(markSpot({ left: 340, top: 10, width: 50, height: 60 }, 390).x).toBeLessThanOrEqual(390 - 48);
    expect(markSpot({ left: 0, top: 10, width: 40, height: 60 }, 390).x).toBeGreaterThanOrEqual(48);
  });
});

describe('countTween', () => {
  it('given the start, then it shows the old value; at the end, the new value', () => {
    expect(countTween(170, 150, 0, 400)).toBe(170);
    expect(countTween(170, 150, 400, 400)).toBe(150);
    expect(countTween(170, 150, 999, 400)).toBe(150);
  });
  it('given the middle of the tween, then it is strictly between (eased: past halfway)', () => {
    const mid = countTween(170, 150, 200, 400);
    expect(mid).toBeLessThan(170);
    expect(mid).toBeGreaterThan(150);
    expect(mid).toBeLessThanOrEqual(160);
  });
  it('given a zero duration, then it snaps', () => {
    expect(countTween(170, 150, 0, 0)).toBe(150);
  });
});
