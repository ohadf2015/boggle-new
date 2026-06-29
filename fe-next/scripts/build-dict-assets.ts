#!/usr/bin/env tsx
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildDictBlob } from '../lib/offline/dictBundle';
import { isHiraganaWord } from '../shared/constants/japaneseLetters';

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'dicts');
const BACKEND = path.join(ROOT, 'backend');

interface Source {
  locale: 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';
  collect: () => Promise<string[]> | string[];
}

function readLines(file: string): string[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

const sources: Source[] = [
  {
    locale: 'en',
    collect: () => {
      const main: string[] = require('an-array-of-english-words');
      const approved = readLines(path.join(BACKEND, 'english_words_approved.txt'));
      return [...main, ...approved];
    },
  },
  {
    locale: 'he',
    collect: () => [
      ...readLines(path.join(BACKEND, 'hebrew_words.txt')),
      ...readLines(path.join(BACKEND, 'hebrew_words_approved.txt')),
    ],
  },
  {
    locale: 'sv',
    collect: async () => {
      const mod = (await import(
        // @ts-expect-error — third-party module without typings
        '@arvidbt/swedish-words/out/index.js'
      )) as { swedish_words: string[] };
      const approved = readLines(path.join(BACKEND, 'swedish_words_approved.txt'));
      return [...mod.swedish_words, ...approved];
    },
  },
  {
    locale: 'ja',
    // HIRAGANA only — the offline/client dict must match board generation +
    // backend validation. Kanji compounds can't be spelled on a kana board.
    collect: () => [
      ...readLines(path.join(BACKEND, 'japanese_words.txt')),
      ...readLines(path.join(BACKEND, 'japanese_words_approved.txt')),
    ].filter(isHiraganaWord),
  },
  {
    locale: 'es',
    collect: () => {
      const spanish: string[] = require('an-array-of-spanish-words');
      const approved = readLines(path.join(BACKEND, 'spanish_words_approved.txt'));
      return [...spanish, ...approved];
    },
  },
  {
    locale: 'ru',
    // Fold ё→е to match backend normalizeRussianWord, so the offline/client
    // dict accepts/rejects exactly what the server does.
    collect: () => [
      ...readLines(path.join(BACKEND, 'russian_words.txt')),
      ...readLines(path.join(BACKEND, 'russian_words_approved.txt')),
    ].map((w) => w.toLowerCase().replace(/ё/g, 'е')),
  },
];

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let totalBytes = 0;
  for (const src of sources) {
    const words = await src.collect();
    if (words.length === 0) {
      console.warn(`[build-dict-assets] skipping ${src.locale}: no source words found`);
      continue;
    }
    const blob = buildDictBlob(words);
    const outFile = path.join(OUT_DIR, `${src.locale}.dict.gz`);
    fs.writeFileSync(outFile, blob);
    totalBytes += blob.byteLength;
    console.log(
      `[build-dict-assets] ${src.locale}: ${words.length} words → ${(blob.byteLength / 1024).toFixed(1)} KB`,
    );
  }
  console.log(`[build-dict-assets] total: ${(totalBytes / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error('[build-dict-assets] failed:', err);
  process.exit(1);
});
