import { describe, it, expect, vi } from 'vitest';
import { loadServerWordList } from '../dictionary';

/** In-memory Storage stub (getItem/setItem only). */
function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    _map: map,
  };
}

function okResponse(words: string[]) {
  return { ok: true, status: 200, json: async () => words } as unknown as Response;
}

describe('loadServerWordList — offline cache', () => {
  it('returns fetched words and caches them on success', async () => {
    const storage = fakeStorage();
    const fetchFn = vi.fn().mockResolvedValue(okResponse(['gato', 'perro']));

    const words = await loadServerWordList('es', { fetchFn, storage });

    expect(words).toEqual(['gato', 'perro']);
    // Cached for next time (offline).
    expect(storage.getItem('lex_wc_dict_es')).toContain('gato');
  });

  it('falls back to cached words when the fetch returns a non-OK status', async () => {
    const storage = fakeStorage({ lex_wc_dict_es: JSON.stringify(['gato', 'perro']) });
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 503 } as Response);

    const words = await loadServerWordList('es', { fetchFn, storage });

    expect(words).toEqual(['gato', 'perro']);
  });

  it('falls back to cached words when the fetch throws (offline / no network)', async () => {
    const storage = fakeStorage({ lex_wc_dict_he: JSON.stringify(['מים', 'שלום']) });
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const words = await loadServerWordList('he', { fetchFn, storage });

    expect(words).toEqual(['מים', 'שלום']);
  });

  it('returns an empty list when offline AND nothing is cached', async () => {
    const storage = fakeStorage();
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const words = await loadServerWordList('ja', { fetchFn, storage });

    expect(words).toEqual([]);
  });
});
