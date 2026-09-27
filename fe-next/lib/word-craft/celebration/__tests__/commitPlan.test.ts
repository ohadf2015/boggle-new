import { describe, it, expect } from 'vitest';
import { planCommitScenes } from '../commitPlan';

describe('planCommitScenes', () => {
  it('soft tier fires ripple + baseline wave (preserves prior feel)', () => {
    expect(planCommitScenes('soft')).toEqual({
      ripple: true,
      wave: true,
      pathTrace: false,
      wordStamp: false,
      edgeFlash: false,
      auroraSweep: false,
      fullscreenBurst: false,
      sound: null,
    });
  });

  it('nice tier adds the commit wave', () => {
    const p = planCommitScenes('nice');
    expect(p.ripple).toBe(true);
    expect(p.wave).toBe(true);
    expect(p.pathTrace).toBe(false);
    expect(p.sound).toBe('combo');
  });

  it('great tier adds path trace + word stamp + sound', () => {
    const p = planCommitScenes('great');
    expect(p.wave).toBe(true);
    expect(p.pathTrace).toBe(true);
    expect(p.wordStamp).toBe(true);
    expect(p.sound).toBe('comboHigh');
  });

  it('huge tier adds edge flash + fullscreen burst', () => {
    const p = planCommitScenes('huge');
    expect(p.wordStamp).toBe(true);
    expect(p.edgeFlash).toBe(true);
    expect(p.fullscreenBurst).toBe(true);
    expect(p.auroraSweep).toBe(false);
  });

  it('bingo tier adds aurora sweep on top of everything', () => {
    const p = planCommitScenes('bingo');
    expect(p.edgeFlash).toBe(true);
    expect(p.auroraSweep).toBe(true);
    expect(p.fullscreenBurst).toBe(true);
    expect(p.sound).toBe('victory');
  });

  it('every tier flags ripple true (baseline tile placement feedback)', () => {
    for (const t of ['soft', 'nice', 'great', 'huge', 'bingo'] as const) {
      expect(planCommitScenes(t).ripple).toBe(true);
    }
  });
});
