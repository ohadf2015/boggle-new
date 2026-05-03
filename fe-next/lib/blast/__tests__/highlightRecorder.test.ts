import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHighlightRecorder } from '../highlightRecorder';
import { useHighlightStore } from '@/stores/highlightStore';

describe('highlightRecorder', () => {
  beforeEach(() => {
    useHighlightStore.getState().reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000_000));
  });

  it('records word submit events with normalized t', () => {
    const r = createHighlightRecorder();
    r.start();
    vi.setSystemTime(new Date(1_000_500));
    r.recordWordSubmit({
      word: 'CAT', score: 30, path: [{ row: 0, col: 0 }],
      combo: 1, specialTilesHit: [],
      preGrid: [], postGrid: [], effectsFired: [],
    });

    const events = useHighlightStore.getState().events;
    expect(events.length).toBe(1);
    expect(events[0]).toMatchObject({ kind: 'word', word: 'CAT', t: 500 });
  });

  it('recordEnd writes a GameEndEvent', () => {
    const r = createHighlightRecorder();
    r.start();
    vi.setSystemTime(new Date(1_010_000));
    r.recordEnd('cleared', 1234);

    const events = useHighlightStore.getState().events;
    expect(events.find(e => e.kind === 'end')).toMatchObject({
      kind: 'end', reason: 'cleared', finalScore: 1234, t: 10_000,
    });
  });

  it('start() resets the store', () => {
    useHighlightStore.getState().append({
      kind: 'word', t: 0, word: 'OLD', path: [], score: 0, combo: 0,
      specialTilesHit: [], preGrid: [], postGrid: [], effectsFired: [],
    });
    const r = createHighlightRecorder();
    r.start();
    expect(useHighlightStore.getState().events).toEqual([]);
  });
});
