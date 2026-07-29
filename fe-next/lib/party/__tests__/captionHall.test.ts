import { describe, it, expect, beforeEach, vi } from 'vitest';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

// Import after stubbing
const { saveWinner, getRandomPast } = await import('../captionHall');

const KEY = 'lexiclash:captionHall';

beforeEach(() => localStorageMock.clear());

describe('saveWinner', () => {
  it('persists entry to localStorage', () => {
    saveWinner({ text: 'Nice caption', username: 'Alice', imageId: 'cat' });
    const stored = JSON.parse(localStorageMock.getItem(KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ text: 'Nice caption', username: 'Alice', imageId: 'cat' });
    expect(stored[0].savedAt).toBeTypeOf('number');
  });

  it('appends multiple entries', () => {
    saveWinner({ text: 'A', username: 'Alice', imageId: 'cat' });
    saveWinner({ text: 'B', username: 'Bob', imageId: 'dog' });
    const stored = JSON.parse(localStorageMock.getItem(KEY)!);
    expect(stored).toHaveLength(2);
  });

  it('trims to MAX_ENTRIES (20)', () => {
    for (let i = 0; i < 25; i++) {
      saveWinner({ text: `Caption ${i}`, username: 'X', imageId: `img${i}` });
    }
    const stored = JSON.parse(localStorageMock.getItem(KEY)!);
    expect(stored).toHaveLength(20);
    expect(stored[0].text).toBe('Caption 5');
  });
});

describe('getRandomPast', () => {
  it('returns null when hall is empty', () => {
    expect(getRandomPast()).toBeNull();
  });

  it('returns null when all entries match the excluded imageId', () => {
    saveWinner({ text: 'A', username: 'Alice', imageId: 'cat' });
    expect(getRandomPast('cat')).toBeNull();
  });

  it('returns a past entry excluding current imageId', () => {
    saveWinner({ text: 'A', username: 'Alice', imageId: 'cat' });
    saveWinner({ text: 'B', username: 'Bob', imageId: 'dog' });
    const result = getRandomPast('dog');
    expect(result).not.toBeNull();
    expect(result!.imageId).toBe('cat');
  });

  it('returns entry when no exclude given', () => {
    saveWinner({ text: 'A', username: 'Alice', imageId: 'cat' });
    const result = getRandomPast();
    expect(result).not.toBeNull();
    expect(result!.text).toBe('A');
  });

  it('returns one of eligible entries randomly', () => {
    for (let i = 0; i < 5; i++) {
      saveWinner({ text: `Caption ${i}`, username: 'X', imageId: `img${i}` });
    }
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const r = getRandomPast('img99');
      if (r) seen.add(r.text);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
