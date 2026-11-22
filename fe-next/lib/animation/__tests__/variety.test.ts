import { jitter, pick, pickOther, sign, lowEndMotion } from '../variety';

describe('variety helpers', () => {
  afterEach(() => vi.restoreAllMocks());

  it('jitter returns the base at the midpoint and the edges at 0 and ~1', () => {
    expect(jitter(10, 4, () => 0.5)).toBe(10);
    expect(jitter(10, 4, () => 0)).toBe(6);
    expect(jitter(10, 4, () => 0.999999)).toBeCloseTo(14, 3);
  });

  it('jitter uses Math.random by default', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    expect(jitter(0, 8)).toBe(4);
  });

  it('pick takes the item the random index lands on', () => {
    expect(pick(['a', 'b', 'c'], () => 0)).toBe('a');
    expect(pick(['a', 'b', 'c'], () => 0.99)).toBe('c');
  });

  it('pickOther never repeats the previous item', () => {
    const items = ['a', 'b', 'c'];
    for (const r of [0, 0.4, 0.99]) expect(pickOther(items, 'b', () => r)).not.toBe('b');
    expect(pickOther(['a'], 'a', () => 0)).toBe('a');
  });

  it('sign is -1 below the midpoint and 1 above it', () => {
    expect(sign(() => 0.2)).toBe(-1);
    expect(sign(() => 0.7)).toBe(1);
  });

  it('lowEndMotion flags 4 cores or 4GB or less', () => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const cores = vi.spyOn(nav, 'hardwareConcurrency', 'get');
    cores.mockReturnValue(8);
    Object.defineProperty(nav, 'deviceMemory', { value: 8, configurable: true });
    expect(lowEndMotion()).toBe(false);
    cores.mockReturnValue(4);
    expect(lowEndMotion()).toBe(true);
    cores.mockReturnValue(8);
    Object.defineProperty(nav, 'deviceMemory', { value: 4, configurable: true });
    expect(lowEndMotion()).toBe(true);
    Object.defineProperty(nav, 'deviceMemory', { value: undefined, configurable: true });
  });
});
