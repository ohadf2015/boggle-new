import { shouldMountBlastFxCanvas } from '../shouldMountBlastFxCanvas';

describe('shouldMountBlastFxCanvas (perf: skip the always-on Pixi overlay on weak devices)', () => {
  it('mounts on a capable device with motion allowed', () => {
    expect(
      shouldMountBlastFxCanvas({ enableComplexAnimations: true, prefersReducedMotion: false }),
    ).toBe(true);
  });

  it('skips on low-end devices (enableComplexAnimations=false)', () => {
    expect(
      shouldMountBlastFxCanvas({ enableComplexAnimations: false, prefersReducedMotion: false }),
    ).toBe(false);
  });

  it('skips when the user prefers reduced motion, even on a capable device', () => {
    expect(
      shouldMountBlastFxCanvas({ enableComplexAnimations: true, prefersReducedMotion: true }),
    ).toBe(false);
  });
});
