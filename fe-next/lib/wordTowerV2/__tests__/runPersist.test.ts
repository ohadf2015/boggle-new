import { describe, expect, it } from 'vitest';
import { clearRunSnapshot, loadRunSnapshot, saveRunSnapshot, shouldConfirmLeave, snapshotKey } from '../runPersist';

function mem(init: Record<string, string> = {}) {
  const store = { ...init };
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    store,
  };
}

describe('runPersist', () => {
  it('given a live climb, when the player tries to leave, then we ask them to confirm', () => {
    expect(shouldConfirmLeave('composing', 3)).toBe(true);
    expect(shouldConfirmLeave('over', 3)).toBe(false);
    expect(shouldConfirmLeave('composing', 0)).toBe(false);
  });

  it('given a daily snapshot, when saved and loaded the same UTC day, then it round-trips', () => {
    const d = new Date('2026-09-21T12:00:00Z');
    const storage = mem();
    saveRunSnapshot({ daily: true, date: '2026-09-21', words: ['tower', 'slab'], peakM: 6.2, floors: 2 }, storage);
    expect(snapshotKey(true, d)).toBe('wt2-session-daily-2026-09-21');
    expect(loadRunSnapshot(true, storage, d)).toEqual({
      daily: true,
      date: '2026-09-21',
      words: ['tower', 'slab'],
      peakM: 6.2,
      floors: 2,
    });
  });

  it('given yesterday\'s daily snapshot, when loaded today, then it is ignored', () => {
    const storage = mem({ 'wt2-session-daily-2026-09-21': JSON.stringify({ daily: true, date: '2026-09-20', words: ['old'], peakM: 1, floors: 1 }) });
    expect(loadRunSnapshot(true, storage, new Date('2026-09-21T12:00:00Z'))).toBeNull();
  });

  it('given a cleared snapshot, when loaded, then null', () => {
    const storage = mem();
    saveRunSnapshot({ daily: false, date: '2026-09-21', words: ['a'], peakM: 1, floors: 1 }, storage);
    clearRunSnapshot(false, storage);
    expect(loadRunSnapshot(false, storage)).toBeNull();
  });
});
