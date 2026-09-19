import { describe, expect, it } from 'vitest';
import { publishHeightM } from '../altitude';

describe('publishHeightM', () => {
  it('given a settled stack jittering in the 3rd decimal, when polled, then the published height does not move', () => {
    // The backdrop eases over 700-1000ms; a value that changes every 100ms
    // restarts every transition forever and the sky tears (the v2 flicker).
    let shown = 4.2;
    for (const raw of [4.2013, 4.1987, 4.2031, 4.1969, 4.2008]) shown = publishHeightM(shown, raw);
    expect(shown).toBe(4.2);
  });

  it('given a new block settles, when polled, then the published height follows it', () => {
    expect(publishHeightM(4.2, 5.64)).toBe(5.64);
  });

  it('given a collapse, when polled, then the drop is published', () => {
    expect(publishHeightM(5.64, 1.1)).toBe(1.1);
  });
});
