import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { burst } from '../fxCore';

function run(rand: number) {
  vi.spyOn(Math, 'random').mockReturnValue(rand);
  const container = document.createElement('div');
  const layer = document.createElement('div');
  const frames: Keyframe[][] = [];
  const proto = HTMLElement.prototype as unknown as { animate?: unknown };
  const had = proto.animate;
  proto.animate = function (this: HTMLElement, kf: Keyframe[]) {
    if (this.hasAttribute('data-shard')) frames.push(kf);
    return { cancel() {}, pause() {} } as unknown as Animation;
  };
  try {
    burst(container, layer, 50, 50, 60, 10);
  } finally {
    proto.animate = had;
  }
  const shards = [...layer.querySelectorAll<HTMLElement>('[data-shard]')];
  const ring = layer.querySelector<HTMLElement>('[data-ring]')!;
  return { shards, ring, frames };
}

const endOf = (kf: Keyframe[]) => String(kf[kf.length - 1].transform);

describe('board burst variety', () => {
  let cores: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    cores = vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
  });
  afterEach(() => vi.restoreAllMocks());

  it('given two word bursts with different rolls, then their colours and paths differ', () => {
    const a = run(0.3);
    const b = run(0.8);
    expect(a.shards[0].style.background).not.toBe(b.shards[0].style.background);
    expect(endOf(a.frames[0])).not.toBe(endOf(b.frames[0]));
    expect(a.ring.style.borderColor).not.toBe(b.ring.style.borderColor);
  });

  it('given any roll, then shards use neo colour tokens and never exceed the budget', () => {
    for (const r of [0, 0.5, 0.99]) {
      const { shards } = run(r);
      expect(shards.length).toBeLessThanOrEqual(10);
      expect(shards.length).toBeGreaterThanOrEqual(8);
      shards.forEach((s) => expect(s.style.background).toMatch(/^var\(--neo-(lime|pink|cyan|purple|yellow|orange)\)$/));
    }
  });

  it('given a low roll, then the bonus shape sprays the shards upward only', () => {
    const { frames } = run(0.05);
    const ys = frames.map((kf) => Number(/calc\(-50% \+ (-?[\d.]+)px\)\) scale/.exec(endOf(kf))![1]));
    ys.forEach((y) => expect(y).toBeLessThan(0));
  });

  it('given a low-end device, then the burst halves its shards', () => {
    cores.mockReturnValue(2);
    expect(run(0.5).shards).toHaveLength(5);
  });
});
