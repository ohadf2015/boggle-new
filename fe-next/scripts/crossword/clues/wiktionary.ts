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
