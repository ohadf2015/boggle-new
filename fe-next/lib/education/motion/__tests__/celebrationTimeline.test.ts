import { describe, it, expect } from 'vitest';
import { celebrationTimeline, CELEBRATION_MAX_MS } from '../celebrationTimeline';

describe('celebrationTimeline', () => {
  it('runs hold, then hero, then pull-back, then chips in order', () => {
    const t = celebrationTimeline(3);
    expect(t.heroAt).toBe(400);
    expect(t.pullBackAt).toBeGreaterThan(t.heroAt);
    expect(t.chipsAt[0]).toBeGreaterThan(t.pullBackAt);
  });

  it('staggers three chips 600ms apart and lands each count-up 400ms after it appears', () => {
    const t = celebrationTimeline(3);
    expect(t.chipsAt[1] - t.chipsAt[0]).toBe(600);
    expect(t.chipsAt[2] - t.chipsAt[1]).toBe(600);
    expect(t.landAt.map((l, i) => l - t.chipsAt[i])).toEqual([400, 400, 400]);
    expect(t.total).toBe(t.landAt[2]);
  });

  it.each([0, 1, 3, 4, 6, 10])('%i chips finish within 4.5s', (n) => {
    const t = celebrationTimeline(n);
    expect(t.chipsAt).toHaveLength(n);
    expect(t.total).toBeLessThanOrEqual(CELEBRATION_MAX_MS);
  });

  it('compresses the stagger instead of overrunning when there are many chips', () => {
    const t = celebrationTimeline(8);
    expect(t.chipsAt[1] - t.chipsAt[0]).toBeLessThan(600);
  });
});
