import type { OfflineStore } from './storage';

export interface PrefetchResult {
  stored: number;
  skipped: boolean;
}

const SIX_HOURS_MS = 6 * 3600_000;
const SEVEN_DAYS_MS = 7 * 24 * 3600_000;
const PREFETCH_ENDPOINT = '/api/daily/prefetch';

interface RemotePuzzle {
  date: string;
  language: string;
  mode: string;
  payload: unknown;
  validUntil: number;
}

function getKvKey(language: string): string {
  return `prefetch_last_${language}`;
}

export async function getCachedDailyPuzzle<T = unknown>(
  store: OfflineStore,
  date: string,
  language: string,
  mode: string,
  nowMs = Date.now(),
): Promise<T | null> {
  const { rows } = await store.sql.run(
    'SELECT payload FROM daily_puzzles_cache WHERE date = ? AND language = ? AND mode = ? AND valid_until > ?',
    [date, language, mode, nowMs],
  );
  if (!rows[0]) return null;
  return JSON.parse((rows[0] as { payload: string }).payload) as T;
}

interface PrefetchOptions {
  language: string;
  store: OfflineStore;
  _fetchFn?: typeof fetch;
  _nowMs?: () => number;
}

export async function prefetchDailyPuzzles(opts: PrefetchOptions): Promise<PrefetchResult> {
  const { language, store, _fetchFn = fetch, _nowMs = () => Date.now() } = opts;
  const now = _nowMs();
  const kvKey = getKvKey(language);

  const lastStr = await store.kv.get(kvKey);
  if (lastStr && now - parseInt(lastStr, 10) < SIX_HOURS_MS) {
    return { stored: 0, skipped: true };
  }

  // Purge rows older than 7 days
  const cutoff = new Date(now - SEVEN_DAYS_MS).toISOString().slice(0, 10);
  await store.sql.run('DELETE FROM daily_puzzles_cache WHERE date < ?', [cutoff]);

  // Build date range: always today; add tomorrow when local hour >= 22
  const today = new Date(now);
  const dates = [today.toISOString().slice(0, 10)];
  if (today.getHours() >= 22) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dates.push(tomorrow.toISOString().slice(0, 10));
  }

  const url = `${PREFETCH_ENDPOINT}?language=${encodeURIComponent(language)}&dates=${dates.join(',')}`;
  let response: Response;
  try {
    response = await _fetchFn(url);
  } catch {
    return { stored: 0, skipped: false };
  }

  if (!response.ok) return { stored: 0, skipped: false };

  let data: { puzzles: RemotePuzzle[] };
  try {
    data = (await response.json()) as { puzzles: RemotePuzzle[] };
  } catch {
    return { stored: 0, skipped: false };
  }

  let stored = 0;
  for (const p of data.puzzles ?? []) {
    await store.sql.run(
      'INSERT OR REPLACE INTO daily_puzzles_cache(date, language, mode, payload, valid_until) VALUES (?, ?, ?, ?, ?)',
      [p.date, p.language, p.mode, JSON.stringify(p.payload), p.validUntil],
    );
    stored++;
  }

  await store.kv.set(kvKey, String(now));
  return { stored, skipped: false };
}
