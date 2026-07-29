import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useHighlightStore, BUFFER_BYTE_CAP } from '../highlightStore';

describe('highlightStore', () => {
  beforeEach(() => {
    useHighlightStore.getState().reset();
  });

  it('starts empty', () => {
    expect(useHighlightStore.getState().events).toEqual([]);
  });

  it('appends events in order', () => {
    const s = useHighlightStore.getState();
    s.append({ kind: 'word', t: 1, word: 'A', path: [], score: 10, combo: 0, specialTilesHit: [], preGrid: [], postGrid: [], effectsFired: [] });
    s.append({ kind: 'word', t: 2, word: 'B', path: [], score: 20, combo: 0, specialTilesHit: [], preGrid: [], postGrid: [], effectsFired: [] });
    const events = useHighlightStore.getState().events as Array<{ word?: string }>;
    expect(events.map(e => e.word)).toEqual(['A', 'B']);
  });

  it('drops oldest events when cap exceeded and reports overflow', () => {
    const s = useHighlightStore.getState();
    const onOverflow = vi.fn();
    s.setOverflowHandler(onOverflow);

    const fakeBig = { kind: 'word', t: 1, word: 'X', path: [], score: 0, combo: 0, specialTilesHit: [], preGrid: [], postGrid: [], effectsFired: [], _padding: 'x'.repeat(2_000_000) } as unknown as Parameters<typeof s.append>[0];
    s.append(fakeBig);
    s.append(fakeBig);
    s.append(fakeBig);

    expect(onOverflow).toHaveBeenCalled();
    expect(useHighlightStore.getState().events.length).toBeLessThan(3);
  });

  it('reset clears events', () => {
    const s = useHighlightStore.getState();
    s.append({ kind: 'word', t: 1, word: 'A', path: [], score: 10, combo: 0, specialTilesHit: [], preGrid: [], postGrid: [], effectsFired: [] });
    s.reset();
    expect(useHighlightStore.getState().events).toEqual([]);
  });

  it('exposes BUFFER_BYTE_CAP constant', () => {
    expect(BUFFER_BYTE_CAP).toBeGreaterThan(0);
  });
});
