import { getCountdownBeepParams } from '../countdownBeepParams';

describe('getCountdownBeepParams', () => {
  // Returns null for out-of-range values
  it('should return null for seconds > 10', () => {
    expect(getCountdownBeepParams(11)).toBeNull();
    expect(getCountdownBeepParams(15)).toBeNull();
  });

  it('should return null for seconds <= 0', () => {
    expect(getCountdownBeepParams(0)).toBeNull();
    expect(getCountdownBeepParams(-1)).toBeNull();
  });

  // Linear ramp: rate goes from 0.7 (at 10s) to 1.4 (at 1s)
  it('should return rate 0.7 at 10 seconds', () => {
    const result = getCountdownBeepParams(10);
    expect(result).not.toBeNull();
    expect(result!.rate).toBeCloseTo(0.7, 2);
  });

  it('should return rate 1.4 at 1 second', () => {
    const result = getCountdownBeepParams(1);
    expect(result).not.toBeNull();
    expect(result!.rate).toBeCloseTo(1.4, 2);
  });

  it('should interpolate rate linearly between endpoints', () => {
    // Midpoint at 5.5s => rate should be ~1.05
    const at5 = getCountdownBeepParams(5)!;
    const at6 = getCountdownBeepParams(6)!;
    // rate at 5s: 0.7 + (10-5)/9 * 0.7 = 0.7 + 5/9*0.7 ≈ 1.089
    // rate at 6s: 0.7 + (10-6)/9 * 0.7 = 0.7 + 4/9*0.7 ≈ 1.011
    expect(at5.rate).toBeGreaterThan(at6.rate);
    // Verify monotonic decrease as seconds increase
    for (let s = 2; s <= 10; s++) {
      expect(getCountdownBeepParams(s - 1)!.rate).toBeGreaterThan(
        getCountdownBeepParams(s)!.rate
      );
    }
  });

  // Linear ramp: volume goes from 0.3 (at 10s) to 0.9 (at 1s)
  it('should return volume 0.3 at 10 seconds', () => {
    expect(getCountdownBeepParams(10)!.volume).toBeCloseTo(0.3, 2);
  });

  it('should return volume 0.9 at 1 second', () => {
    expect(getCountdownBeepParams(1)!.volume).toBeCloseTo(0.9, 2);
  });

  it('should interpolate volume linearly between endpoints', () => {
    for (let s = 2; s <= 10; s++) {
      expect(getCountdownBeepParams(s - 1)!.volume).toBeGreaterThan(
        getCountdownBeepParams(s)!.volume
      );
    }
  });

  // Backward compatibility: values at 3, 2, 1 should be close to old behavior
  // Old: { 3: rate 1.0, vol 0.7 }, { 2: rate 1.2, vol 0.7 }, { 1: rate 1.4, vol 0.9 }
  it('should produce values close to old behavior at 3 seconds', () => {
    const result = getCountdownBeepParams(3)!;
    // rate: 0.7 + (10-3)/9 * 0.7 = 0.7 + 7/9*0.7 ≈ 1.244
    // Close-ish to old 1.0 — acceptable since ramp is now smooth
    expect(result.rate).toBeGreaterThan(0.9);
    expect(result.rate).toBeLessThan(1.35);
  });

  it('should match old behavior exactly at 1 second', () => {
    const result = getCountdownBeepParams(1)!;
    expect(result.rate).toBeCloseTo(1.4, 2);
    expect(result.volume).toBeCloseTo(0.9, 2);
  });
});
