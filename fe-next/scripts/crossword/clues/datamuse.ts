// Thin async adapter over the Datamuse API (build-time only) with a disk cache so reruns
// are free and offline. Datamuse `md=dp` returns Wiktionary-backed definitions + POS tags
// + a corpus-frequency score. English only.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface DatamuseEntry {
  word: string;
  defs: string[]; // raw Datamuse defs, e.g. "n\t(countable) One of the large bodies of water…"
  pos: string; // n | v | adj | adv
  score: number; // corpus frequency (higher = more common)
}

const CACHE_DIR = join(__dirname, '.cache');

function cachePathFor(word: string): string {
  return join(CACHE_DIR, `${word}.json`);
}

/** Fetch (or read from cache) the Datamuse entry for an exact word. null if no definition. */
export async function fetchDatamuse(word: string): Promise<DatamuseEntry | null> {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = cachePathFor(word);
  if (existsSync(cachePath)) {
    const raw = readFileSync(cachePath, 'utf8');
    return raw === 'null' ? null : (JSON.parse(raw) as DatamuseEntry);
  }

  const url = `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dp&max=1`;
  const res = await fetch(url);
  const arr = (await res.json()) as Array<{
    word: string;
    defs?: string[];
    tags?: string[];
    score?: number;
  }>;
  const hit = arr.find((a) => a.word === word) ?? arr[0];
  if (!hit || !hit.defs?.length) {
    writeFileSync(cachePath, 'null');
    return null;
  }
  const pos = (hit.tags ?? []).find((t) => /^(n|v|adj|adv)$/.test(t)) ?? 'n';
  const entry: DatamuseEntry = { word, defs: hit.defs, pos, score: hit.score ?? 0 };
  writeFileSync(cachePath, JSON.stringify(entry));
  return entry;
}
