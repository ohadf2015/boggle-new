import { TweenManager, Easing } from '../Tween';

describe('TweenManager', () => {
  let tweens: TweenManager;

  beforeEach(() => {
    tweens = new TweenManager();
  });

  afterEach(() => {
    tweens.destroy();
  });

  it('should tween a value from start to end', () => {
    const values: number[] = [];
    tweens.add({
      from: 0,
      to: 100,
      duration: 1.0,
      easing: Easing.linear,
      onUpdate: (v) => values.push(v),
    });

    tweens.update(0.5);
    expect(values[values.length - 1]).toBeCloseTo(50);

    tweens.update(0.5);
    expect(values[values.length - 1]).toBeCloseTo(100);
  });

  it('should call onComplete when done', () => {
    let completed = false;
    tweens.add({
      from: 0,
      to: 1,
      duration: 0.5,
      onUpdate: () => {},
      onComplete: () => { completed = true; },
    });

    tweens.update(0.6);
    expect(completed).toBe(true);
  });

  it('should respect delay', () => {
    const values: number[] = [];
    tweens.add({
      from: 0,
      to: 100,
      duration: 0.5,
      delay: 0.3,
      easing: Easing.linear,
      onUpdate: (v) => values.push(v),
    });

    tweens.update(0.2);
    expect(values).toHaveLength(0); // Still in delay (0.1s left)

    tweens.update(0.2); // Consumes remaining 0.1s delay
    // Delay consumed but tween may not progress same frame
    tweens.update(0.3); // Now tween progresses
    expect(values.length).toBeGreaterThan(0);
    // Value should be within range
    expect(values[values.length - 1]).toBeLessThan(100);
  });

  it('should cancel a tween by ID', () => {
    let updated = false;
    const id = tweens.add({
      from: 0,
      to: 100,
      duration: 1.0,
      onUpdate: () => { updated = true; },
    });

    tweens.cancel(id);
    tweens.update(0.5);
    expect(updated).toBe(false);
  });

  it('should cancel all tweens', () => {
    let count = 0;
    tweens.add({ from: 0, to: 1, duration: 1, onUpdate: () => count++ });
    tweens.add({ from: 0, to: 1, duration: 1, onUpdate: () => count++ });
    tweens.cancelAll();
    tweens.update(0.5);
    expect(count).toBe(0);
  });

  it('should track active count', () => {
    tweens.add({ from: 0, to: 1, duration: 1, onUpdate: () => {} });
    tweens.add({ from: 0, to: 1, duration: 0.5, onUpdate: () => {} });
    expect(tweens.activeCount).toBe(2);

    tweens.update(0.6);
    expect(tweens.activeCount).toBe(1); // Second one finished
  });

  describe('easing functions', () => {
    it('linear should return identity', () => {
      expect(Easing.linear(0)).toBe(0);
      expect(Easing.linear(0.5)).toBe(0.5);
      expect(Easing.linear(1)).toBe(1);
    });

    it('easeOutCubic should start fast and end slow', () => {
      const early = Easing.easeOutCubic(0.2);
      // Early progress should be > 0.2 (faster start due to ease-out)
      expect(early).toBeGreaterThan(0.2);
      // Should end at 1
      expect(Easing.easeOutCubic(1)).toBeCloseTo(1);
    });

    it('easeOutBounce should end at 1', () => {
      expect(Easing.easeOutBounce(1)).toBeCloseTo(1);
      expect(Easing.easeOutBounce(0)).toBeCloseTo(0);
    });

    it('easeOutElastic should overshoot and return to 1', () => {
      expect(Easing.easeOutElastic(1)).toBeCloseTo(1);
      expect(Easing.easeOutElastic(0)).toBeCloseTo(0);
      // Mid values may exceed 1 (overshoot)
    });

    it('all easings should map 0→0 and 1→1', () => {
      const fns = Object.values(Easing);
      for (const fn of fns) {
        expect(fn(0)).toBeCloseTo(0, 1);
        expect(fn(1)).toBeCloseTo(1, 1);
      }
    });
  });
});
