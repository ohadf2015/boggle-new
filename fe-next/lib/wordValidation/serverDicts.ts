// Server-side canonical dictionary loaders. Lazy-cached per process.
// Extracted from app/api/validate-word/route.ts so multiple routes
// (validate-word + scores/sync) can share the same dictionary memory.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizeHebrewWord, normalizeSpanishWord } from '@/shared/utils/wordNormalization';
import { extractHiraganaWords } from '@/shared/constants/japaneseLetters';

let englishDict: Set<string> | null = null;
let spanishDict: Set<string> | null = null;
let hebrewDict: Set<string> | null = null;
let swedishDict: Set<string> | null = null;
let japaneseDict: Set<string> | null = null;

async function loadEnglish(): Promise<Set<string>> {
  if (englishDict) return englishDict;
  const words = (await import('an-array-of-english-words', { with: { type: 'json' } }))
    .default as string[];
  englishDict = new Set(words.map((w) => w.toLowerCase()));
  return englishDict;
}

async function loadSpanish(): Promise<Set<string>> {
  if (spanishDict) return spanishDict;
  const words = (await import('an-array-of-spanish-words', { with: { type: 'json' } }))
    .default as string[];
  // Normalize at load to match validate-time normalization (accent-strip,
  // ñ-preserve). Keeps this path symmetric with backend/dictionary.ts so the
  // same word can't be valid live but rejected on offline-queue replay.
  spanishDict = new Set(words.map((w) => normalizeSpanishWord(w)));
  return spanishDict;
}

function loadHebrew(): Set<string> {
  if (hebrewDict) return hebrewDict;
  hebrewDict = new Set<string>();
  const backendDir = path.join(process.cwd(), 'backend');
  for (const file of ['hebrew_words.txt', 'hebrew_words_approved.txt']) {
    const p = path.join(backendDir, file);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf-8');
    content
      .split('\n')
      .map((w) => normalizeHebrewWord(w.trim()))
      .filter((w) => w.length > 0)
      .forEach((w) => hebrewDict!.add(w));
  }
  return hebrewDict;
}

function loadSwedish(): Set<string> {
  if (swedishDict) return swedishDict;
  swedishDict = new Set<string>();
  const swPath = path.join(process.cwd(), 'node_modules/@arvidbt/swedish-words/out/index.js');
  if (fs.existsSync(swPath)) {
    const content = fs.readFileSync(swPath, 'utf-8');
    const arrayMatch = content.match(/var swedish_words = \[([\s\S]*?)\];/);
    if (arrayMatch) {
      const validPattern = /^[a-zåäöéàü]+$/i;
      arrayMatch[1].split(',').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          try {
            const jsonCompatible = trimmed.replace(/\\x([0-9A-Fa-f]{2})/g, '\\u00$1');
            const word = JSON.parse(jsonCompatible);
            if (word && word.length > 1 && validPattern.test(word)) {
              swedishDict!.add(word.toLowerCase());
            }
          } catch {
            // skip
          }
        }
      });
    }
  }
  const approvedFile = path.join(process.cwd(), 'backend', 'swedish_words_approved.txt');
  if (fs.existsSync(approvedFile)) {
    fs.readFileSync(approvedFile, 'utf-8')
      .split('\n')
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0)
      .forEach((w) => swedishDict!.add(w));
  }
  return swedishDict;
}

function loadJapanese(): Set<string> {
  if (japaneseDict) return japaneseDict;
  japaneseDict = new Set<string>();
  const backendDir = path.join(process.cwd(), 'backend');
  // HIRAGANA only — must match backend Dictionary.japaneseWords / board grids.
  // Loading kanji_compounds here would reject the hiragana words players score.
  for (const file of ['japanese_words.txt', 'japanese_words_approved.txt']) {
    const p = path.join(backendDir, file);
    if (!fs.existsSync(p)) continue;
    for (const w of extractHiraganaWords(fs.readFileSync(p, 'utf-8'))) japaneseDict.add(w);
  }
  return japaneseDict;
}

export async function validateWordOnServer(word: string, language: string): Promise<boolean> {
  const trimmed = word.trim();
  if (!trimmed) return false;

  switch (language) {
    case 'en':
      return (await loadEnglish()).has(trimmed.toLowerCase());
    case 'es':
      return (await loadSpanish()).has(normalizeSpanishWord(trimmed));
    case 'he':
      return loadHebrew().has(normalizeHebrewWord(trimmed));
    case 'sv':
      return loadSwedish().has(trimmed.toLowerCase());
    case 'ja':
      return loadJapanese().has(trimmed);
    default:
      return false;
  }
}

// Test escape hatch — reset cached dicts between tests.
export function __resetServerDictsForTest(): void {
  englishDict = null;
  spanishDict = null;
  hebrewDict = null;
  swedishDict = null;
  japaneseDict = null;
}
