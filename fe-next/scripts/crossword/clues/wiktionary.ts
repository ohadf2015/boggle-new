// Build-time crossword clue source backed by native Wiktionary definitions (all 6 langs),
// mirroring datamuse.ts (which is English-only). Disk-cached so reruns are free + polite.
// Reuses the runtime parser (lib/dictionary/wiktionaryMeaning) and the shared clue gates.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fetchJaWiktionaryEntry, fetchWiktionaryMeaning } from '../../../lib/dictionary/wiktionaryMeaning';
import { definitionToClue } from '../../../lib/crossword/clues/clueText';
import { jaClueFromDefinition } from '../../../lib/crossword/clues/jaClue';

const CACHE_DIR = join(__dirname, '.cache', 'wiktionary'); // under the already-gitignored .cache/

function cachePathFor(lang: string, word: string): string {
  return join(CACHE_DIR, `${lang}-${encodeURIComponent(word)}.json`);
}

/** Cached native definition for (word, lang); 'null' is cached too so misses don't refetch. */
export async function fetchWiktDef(word: string, lang: string): Promise<string | null> {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const p = cachePathFor(lang, word);
  if (existsSync(p)) {
    const raw = readFileSync(p, 'utf8');
    return raw === 'null' ? null : (JSON.parse(raw) as string);
  }
  const def = await fetchWiktionaryMeaning(word, lang);
  writeFileSync(p, def == null ? 'null' : JSON.stringify(def));
  return def;
}

/** Native Wiktionary clue for a crossword answer (cleaned + de-circularized + length-gated), or null. */
export async function wiktionaryClue(word: string, lang: string): Promise<string | null> {
  const def = await fetchWiktDef(word, lang);
  return def ? definitionToClue(def, word) : null;
}

type JaEntry = { def: string | null; forms: string[] };

/** Cached ja entry: the definition plus the headword's kanji spellings (needed for the circular gate). */
async function fetchJaEntry(word: string): Promise<JaEntry> {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const p = join(CACHE_DIR, `ja-entry-${encodeURIComponent(word)}.json`);
  if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8')) as JaEntry;
  const entry = await fetchJaWiktionaryEntry(word);
  writeFileSync(p, JSON.stringify(entry));
  return entry;
}

/** ja: whole first sentence, family-safe, non-circular (kana or kanji), or null. `hadDef` separates misses from rejects. */
export async function wiktionaryClueJa(word: string): Promise<{ clue: string | null; hadDef: boolean }> {
  const { def, forms } = await fetchJaEntry(word);
  return { clue: jaClueFromDefinition(def, word, forms), hadDef: !!def };
}

const UA = 'LexiClash/1.0 (word game; +https://lexiclash.app)';

/** Cached raw extract of the word's OWN page (no redirects: a form redirecting to its lemma is not a lemma). */
export async function fetchWiktExtract(word: string, lang: string): Promise<string | null> {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const p = join(CACHE_DIR, `${lang}-extract-${encodeURIComponent(word)}.json`);
  if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8')) as string | null;
  const url = `https://${lang}.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&formatversion=2&titles=${encodeURIComponent(word)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${word}`); // not cached, so a rate-limit miss is retried next run
  const data = (await res.json()) as { query?: { pages?: { extract?: string }[] } };
  const extract = data.query?.pages?.[0]?.extract ?? null;
  writeFileSync(p, JSON.stringify(extract));
  return extract;
}
