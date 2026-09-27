import { describe, it, expect } from 'vitest';
import { flowFrameLevel, FLOW_FRAME_AT, FLOW_FIRE_AT } from '../flowFrame';

describe('flowFrameLevel — escalating "in the zone" screen frame', () => {
  it('is dormant below the frame threshold (no chrome for a cold tower)', () => {
    for (let s = 0; s < FLOW_FRAME_AT; s++) {
      expect(flowFrameLevel(s)).toBeNull();
    }
  });

  it('lights an electric frame once the streak reaches the threshold', () => {
    const f = flowFrameLevel(FLOW_FRAME_AT);
    expect(f).not.toBeNull();
    expect(f!.fire).toBe(false);
    expect(typeof f!.color).toBe('string');
  });

  it('escalates to the gold "ON FIRE" frame at the fire threshold', () => {
    const f = flowFrameLevel(FLOW_FIRE_AT);
    expect(f!.fire).toBe(true);
  });

  it('intensity rises with the streak and never exceeds 1', () => {
    let prev = 0;
    for (let s = FLOW_FRAME_AT; s <= FLOW_FIRE_AT + 6; s++) {
      const f = flowFrameLevel(s)!;
      expect(f.intensity).toBeGreaterThan(0);
      expect(f.intensity).toBeLessThanOrEqual(1);
      expect(f.intensity).toBeGreaterThanOrEqual(prev);
      prev = f.intensity;
    }
  });

  it('FLOW_FIRE_AT is strictly above FLOW_FRAME_AT (two distinct tiers)', () => {
    expect(FLOW_FIRE_AT).toBeGreaterThan(FLOW_FRAME_AT);
  });
});
