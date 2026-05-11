import type { OfflineStore } from './storage';

function normalize(word: string): string {
  return word.toLocaleLowerCase();
}

export async function isDictLoaded(store: OfflineStore, locale: string): Promise<boolean> {
  const { rows } = await store.sql.run(
    'SELECT COUNT(*) AS c FROM dict_words WHERE locale = ? LIMIT 1',
    [locale],
  );
  const count = (rows[0] as { c: number } | undefined)?.c ?? 0;
  return count > 0;
}

export async function loadDictWords(
  store: OfflineStore,
  locale: string,
  words: string[],
): Promise<void> {
  if (words.length === 0) return;
  const paramsArray: unknown[][] = words
    .map((raw) => normalize(raw))
    .filter((w) => w.length > 0)
    .map((w) => [locale, w]);
  if (paramsArray.length === 0) return;
  await store.sql.runBulk('INSERT OR IGNORE INTO dict_words(locale, word) VALUES (?, ?)', paramsArray);
}

export async function validateOffline(
  store: OfflineStore,
  word: string,
  locale: string,
): Promise<boolean> {
  const { rows } = await store.sql.run(
    'SELECT 1 AS hit FROM dict_words WHERE locale = ? AND word = ? LIMIT 1',
    [locale, normalize(word)],
  );
  return rows.length > 0;
}

export async function lookupPrefix(
  store: OfflineStore,
  prefix: string,
  locale: string,
  limit = 25,
): Promise<string[]> {
  const start = normalize(prefix);
  const end = start.slice(0, -1) + String.fromCharCode(start.charCodeAt(start.length - 1) + 1);
  const { rows } = await store.sql.run(
    'SELECT word FROM dict_words WHERE locale = ? AND word >= ? AND word < ? ORDER BY word LIMIT ?',
    [locale, start, end, limit],
  );
  return rows.map((r) => (r as { word: string }).word);
}
