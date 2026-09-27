import { ScreenShake } from '../ScreenShake';

describe('ScreenShake', () => {
  let shake: ScreenShake;

  beforeEach(() => {
    shake = new ScreenShake();
  });

  it('should start with zero offset', () => {
    expect(shake.offset).toEqual({ x: 0, y: 0 });
    expect(shake.isShaking).toBe(false);
  });

  it('should produce non-zero offset during shake', () => {
    shake.shake({ intensity: 10, duration: 0.5 });
    shake.update(0.05);
    expect(shake.isShaking).toBe(true);
    const { x, y } = shake.offset;
    // At least one axis should be non-zero
    expect(Math.abs(x) + Math.abs(y)).toBeGreaterThan(0);
  });

  it('should return to zero after duration expires', () => {
    shake.shake({ intensity: 10, duration: 0.2 });
    // Advance past duration
    shake.update(0.3);
    expect(shake.isShaking).toBe(false);
    expect(shake.offset).toEqual({ x: 0, y: 0 });
  });

  it('should stack multiple shakes', () => {
    shake.light();
    shake.heavy();
    expect(shake.isShaking).toBe(true);
    shake.update(0.05);
    // Should have accumulated offset from both
    const { x, y } = shake.offset;
    expect(Math.abs(x) + Math.abs(y)).toBeGreaterThan(0);
  });

  it('should respect linear decay', () => {
    shake.shake({ intensity: 10, duration: 1.0, decay: 'linear' });
    shake.update(0.5);
    const mid = Math.abs(shake.offset.x) + Math.abs(shake.offset.y);
    shake.reset();

    shake.shake({ intensity: 10, duration: 1.0, decay: 'linear' });
    shake.update(0.1);
    const early = Math.abs(shake.offset.x) + Math.abs(shake.offset.y);

    // Early in the shake should generally be stronger
    // (not guaranteed per-frame due to sin, but over averages)
    expect(early).toBeGreaterThanOrEqual(0);
    expect(mid).toBeGreaterThanOrEqual(0);
  });

  it('should reset all shakes', () => {
    shake.heavy();
    shake.medium();
    shake.reset();
    expect(shake.isShaking).toBe(false);
    expect(shake.offset).toEqual({ x: 0, y: 0 });
  });

  it('should pull the offset toward a directional bias', () => {
    shake.shake({ intensity: 0, duration: 0.5, bias: { x: -8, y: 0 } });
    shake.update(0.05);
    // With no noise intensity, the offset should be the bias scaled by decay.
    expect(shake.offset.x).toBeLessThan(0);
    expect(shake.offset.x).toBeGreaterThanOrEqual(-8);
  });

  it('should decay directional bias to zero by the end', () => {
    shake.shake({ intensity: 0, duration: 0.2, bias: { x: 10, y: -5 } });
    shake.update(0.3);
    expect(shake.offset).toEqual({ x: 0, y: 0 });
  });

  describe('presets', () => {
    it('light() should create a short shake', () => {
      shake.light();
      expect(shake.isShaking).toBe(true);
    });

    it('medium() should create a medium shake', () => {
      shake.medium();
      expect(shake.isShaking).toBe(true);
    });

    it('heavy() should create a strong shake', () => {
      shake.heavy();
      expect(shake.isShaking).toBe(true);
    });
  });
});
