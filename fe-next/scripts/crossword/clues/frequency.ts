import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { foldEsAccents } from '../../../lib/crossword/answer';

export type FreqLang = 'es' | 'ru';
export type FreqFile = { lang: FreqLang; articles: number; tokens: number; top: [string, number][] };

// Keys fold the way the crossword answer checker does, so a corpus hit matches a grid answer.
const SCRIPT: Record<FreqLang, RegExp> = { es: /^[a-zñ]+$/, ru: /^[а-я]+$/ };

export function freqKey(word: string, lang: FreqLang): string {
  const w = word.normalize('NFC').toLowerCase();
  return lang === 'es' ? foldEsAccents(w) : w.replace(/ё/g, 'е');
}

export function tokenizeForFreq(text: string, lang: FreqLang): string[] {
  const out: string[] = [];
  for (const m of text.normalize('NFC').match(/\p{L}+/gu) ?? []) {
    if (m[0] !== m[0].toLowerCase()) continue; // capitalized = proper noun or sentence start; both skew homographs
    const k = freqKey(m, lang);
    if (SCRIPT[lang].test(k)) out.push(k);
  }
  return out;
}

export function countTokens(texts: Iterable<string>, lang: FreqLang, into = new Map<string, number>()): Map<string, number> {
  for (const t of texts) for (const k of tokenizeForFreq(t, lang)) into.set(k, (into.get(k) ?? 0) + 1);
  return into;
}

export function topCounts(counts: Map<string, number>, n: number): [string, number][] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, n);
}

export function rankOf(top: [string, number][], lang: FreqLang): (word: string, n: number) => boolean {
  const rank = new Map<string, number>();
  top.forEach(([w], i) => { const k = freqKey(w, lang); if (!rank.has(k)) rank.set(k, i + 1); });
  return (word, n) => (rank.get(freqKey(word, lang)) ?? Infinity) <= n;
}

export const freqPath = (lang: string) => join(__dirname, 'freq', `${lang}.json`);

export function loadFreqRank(lang: FreqLang): (word: string, n: number) => boolean {
  const p = freqPath(lang);
  if (!existsSync(p)) throw new Error(`no frequency list at ${p}; run corpusFrequency.ts ${lang} first`);
  return rankOf((JSON.parse(readFileSync(p, 'utf8')) as FreqFile).top, lang);
}

type SelectOpts = {
  lang: FreqLang;
  inTop: (word: string, n: number) => boolean;
  n: number;
  dict: Set<string>;
  bankKeys: Set<string>;
  deny?: Set<string>;
};

/** Mini-sized (3-4), in-dictionary, top-N words not yet banked; `word` keeps its spelling for the Wiktionary lookup. */
export function selectFreqCandidates(words: Iterable<string>, { lang, inTop, n, dict, bankKeys, deny = new Set() }: SelectOpts): { word: string; key: string }[] {
  const banked = new Set([...bankKeys, ...deny].map((k) => freqKey(k, lang)));
  const seen = new Set<string>();
  const out: { word: string; key: string }[] = [];
  for (const raw of words) {
    const word = raw.trim().normalize('NFC').toLowerCase();
    const key = freqKey(word, lang);
    if (key.length < 3 || key.length > 4 || !SCRIPT[lang].test(key)) continue;
    if (seen.has(key) || banked.has(key) || !dict.has(key) || !inTop(key, n)) continue;
    seen.add(key);
    out.push({ word, key });
  }
  return out;
}

/** Reviewer-denied keys (obscure/odd clues found in a sample review), one per line, # comments. */
export function loadDeny(lang: FreqLang): Set<string> {
  const p = join(__dirname, 'freq', `${lang}.deny.txt`);
  if (!existsSync(p)) return new Set();
  return new Set(readFileSync(p, 'utf8').split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean));
}
