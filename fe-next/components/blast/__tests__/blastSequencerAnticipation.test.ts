import { describe, it, expect } from 'vitest';
import { ANIM_TIMING } from '../hooks/useBlastSequencer';

describe('useBlastSequencer anticipation timing', () => {
  it('has a standard anticipation timing', () => {
    expect(ANIM_TIMING.anticipation).toBe(120);
  });

  it('has a longer anticipation timing for special tiles', () => {
    expect(ANIM_TIMING.anticipationSpecial).toBeGreaterThan(ANIM_TIMING.anticipation);
    expect(ANIM_TIMING.anticipationSpecial).toBe(220);
  });
});
