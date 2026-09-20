import { describe, it, expect, beforeEach } from 'vitest';
import { readCleared, recordCleared, clearClearedNodes, isFreshRun } from '../clearedNodes';

describe('clearedNodes', () => {
  beforeEach(() => {
    const m = new Map<string, string>();
    (globalThis as { sessionStorage?: unknown }).sessionStorage = {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => { m.set(k, v); },
      removeItem: (k: string) => { m.delete(k); },
    };
  });

  it('Given nothing played, when the cleared list is read, then it is empty', () => {
    expect(readCleared(1)).toEqual([]);
  });

  it('Given a node was played out, when it is recorded, then it reads back — once, per world', () => {
    recordCleared(1, 'r0l1');
    recordCleared(1, 'r0l1');
    recordCleared(2, 'r1l0');
    expect(readCleared(1)).toEqual(['r0l1']);
    expect(readCleared(2)).toEqual(['r1l0']);
  });

  it('Given a fresh run starts, when the list is cleared, then the old run leaves nothing behind', () => {
    recordCleared(1, 'r0l1');
    clearClearedNodes(1);
    expect(readCleared(1)).toEqual([]);
  });

  it('Given storage throws, when the list is read, then it degrades to empty instead of crashing', () => {
    (globalThis as { sessionStorage?: unknown }).sessionStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    expect(readCleared(1)).toEqual([]);
    expect(() => recordCleared(1, 'r0l0')).not.toThrow();
  });

  it('Given the run has not loaded yet, when freshness is asked, then it is NOT fresh (the history must survive the mount)', () => {
    expect(isFreshRun(null)).toBe(false);
    expect(isFreshRun(undefined)).toBe(false);
  });

  it('Given a run that walked a node, then it is not fresh; given an empty path, then it is', () => {
    expect(isFreshRun({ path: ['r0l1'] })).toBe(false);
    expect(isFreshRun({ path: [] })).toBe(true);
  });
});
