import { describe, it, expect } from 'vitest';
import { buildRevealTimeline, REVEAL } from '../revealTimeline';

describe('buildRevealTimeline', () => {
  it('opens on the TIME! beat, then reveals from last place up to 2nd, then 1st', () => {
    const tl = buildRevealTimeline(4);
    const names = tl.events.map((e) => e.name);
    expect(names).toEqual(['header', 'row-4', 'row-3', 'row-2', 'row-1', 'card', 'footer']);
    expect(tl.events[0].at).toBe(REVEAL.timeMs);
  });

  it('runs about 4.2s on a four-player room', () => {
    const tl = buildRevealTimeline(4);
    expect(tl.doneAt).toBeGreaterThanOrEqual(3800);
    expect(tl.doneAt).toBeLessThanOrEqual(4400);
  });

  it('never takes longer than the four-player sequence, even in an 8-player room', () => {
    expect(buildRevealTimeline(8).doneAt).toBeLessThanOrEqual(buildRevealTimeline(4).doneAt + 1);
  });

  it('gives 1st place the long slam and the counters their full roll', () => {
    const tl = buildRevealTimeline(3);
    const at = (n: string) => tl.events.find((e) => e.name === n)!.at;
    expect(at('card') - at('row-1')).toBe(REVEAL.firstMs);
    expect(at('footer') - at('card')).toBe(REVEAL.countMs);
  });

  it('is monotonic', () => {
    for (const n of [1, 2, 5, 8, 14]) {
      const ats = buildRevealTimeline(n).events.map((e) => e.at);
      expect([...ats].sort((a, b) => a - b)).toEqual(ats);
    }
  });

  it('handles a solo room (only 1st place)', () => {
    expect(buildRevealTimeline(1).events.map((e) => e.name)).toEqual(['header', 'row-1', 'card', 'footer']);
  });

  it('reports the stage each rank becomes visible at', () => {
    const tl = buildRevealTimeline(3);
    // stage index = position in events + 1 (stage 0 = nothing revealed yet)
    expect(tl.stageOf('row-3')).toBe(2);
    expect(tl.stageOf('row-1')).toBe(4);
    expect(tl.stageOf('footer')).toBe(tl.events.length);
  });
});
