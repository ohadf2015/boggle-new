import { describe, it, expect } from 'vitest';
import { GAG_BOX_PX, MIN_STAGE_PX, gagStageScale, pickStage } from '../stage';

const box = (width: number, height: number) => ({ width, height });

describe('mascot gag stage', () => {
  it('Given the phone band is hidden and the desktop rail is shown, picks the rail', () => {
    expect(pickStage([box(0, 0), box(300, 190)])).toBe(1);
  });

  it('Given every candidate is shorter than a readable mascot, picks none so the host falls back to the edge strip', () => {
    expect(pickStage([box(366, MIN_STAGE_PX - 1), box(0, 0)])).toBe(-1);
  });

  it('Given a roomy band, sizes the mascot to 96-120px', () => {
    const px = gagStageScale(200) * GAG_BOX_PX;
    expect(px).toBeGreaterThanOrEqual(96);
    expect(px).toBeLessThanOrEqual(120);
  });

  it('Given a short band, shrinks the mascot to fit with headroom for props', () => {
    const h = MIN_STAGE_PX + 10;
    expect(gagStageScale(h) * GAG_BOX_PX).toBeLessThan(h);
    expect(gagStageScale(h) * GAG_BOX_PX).toBeGreaterThanOrEqual(48);
  });
});
