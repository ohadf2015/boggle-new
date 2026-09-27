/**
 * Server-only: everyday words per language for hints + hunt targets
 * (backend/common_hunt_words*.txt, the same curated lists blast uses).
 * Cached per language; a missing file logs and yields [] so the dealer
 * falls back to any real word instead of failing the level.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const cache = new Map<string, Promise<string[]>>();

export function loadCommonWords(language: string): Promise<string[]> {
  const hit = cache.get(language);
  if (hit) return hit;
  const file = language === 'en' ? 'common_hunt_words.txt' : `common_hunt_words_${language}.txt`;
  const p = readFile(resolve(process.cwd(), 'backend', file), 'utf8')
    .then((txt) => txt.split('\n').map((l) => l.trim().toLowerCase()).filter(Boolean))
    .catch((err) => {
      console.warn(`[adventure] common word list ${file} unavailable: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    });
  cache.set(language, p);
  return p;
}
