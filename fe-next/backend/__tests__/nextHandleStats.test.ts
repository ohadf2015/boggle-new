/**
 * Bounded Next-handle counters for MEMWATCH.
 * Unique pathname cardinality is the #94890 (router LRU) signal:
 * idle games + climbing unique= crawler URL fan-out, not a game Map.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  formatNextHandleCounts,
  noteNextHandle,
  noteNextHandleDrop,
  resetNextHandleStatsForTests,
  NEXT_HANDLE_UNIQUE_CAP,
} from '../modules/nextHandleStats';

afterEach(() => {
  resetNextHandleStatsForTests();
});

describe('nextHandleStats', () => {
  it('starts at zero', () => {
    expect(formatNextHandleCounts()).toBe('next[hits=0 unique=0 overflow=0 drop=0]');
  });

  it('counts hits and unique pathnames (query string stripped)', () => {
    noteNextHandle('/en');
    noteNextHandle('/en?utm=1');
    noteNextHandle('/he/blog/foo');
    expect(formatNextHandleCounts()).toBe('next[hits=3 unique=2 overflow=0 drop=0]');
  });

  it(`caps unique keys at ${NEXT_HANDLE_UNIQUE_CAP} so the diag Set cannot leak`, () => {
    for (let i = 0; i < NEXT_HANDLE_UNIQUE_CAP + 25; i += 1) {
      noteNextHandle(`/en/p/${i}`);
    }
    const text = formatNextHandleCounts();
    expect(text).toBe(
      `next[hits=${NEXT_HANDLE_UNIQUE_CAP + 25} unique=${NEXT_HANDLE_UNIQUE_CAP} overflow=25 drop=0]`,
    );
  });

  it('does not increment overflow for a path already inside the cap', () => {
    noteNextHandle('/en');
    for (let i = 0; i < NEXT_HANDLE_UNIQUE_CAP - 1; i += 1) {
      noteNextHandle(`/x/${i}`);
    }
    // set is full; repeating /en must not overflow
    noteNextHandle('/en');
    expect(formatNextHandleCounts()).toBe(
      `next[hits=${NEXT_HANDLE_UNIQUE_CAP + 1} unique=${NEXT_HANDLE_UNIQUE_CAP} overflow=0 drop=0]`,
    );
  });

  it('counts gate drops separately from handle() hits', () => {
    noteNextHandle('/en');
    noteNextHandleDrop('unknown-segment');
    noteNextHandleDrop('probe');
    expect(formatNextHandleCounts()).toBe('next[hits=1 unique=1 overflow=0 drop=2]');
  });
});
