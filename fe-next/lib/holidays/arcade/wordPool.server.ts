import * as fs from 'fs';
import * as path from 'path';
import { GIFT_WORDS } from '../dailyGiftWords';
import { fold } from './letters';

const cache = new Map<string, string[]>();

const LETTERS_ONLY = /^[\p{L}]+$/u;

export function huntWords(lang: string): string[] {
  const hit = cache.get(lang);
  if (hit) return hit;
  const file = lang === 'en' ? 'common_hunt_words.txt' : `common_hunt_words_${lang}.txt`;
  let words: string[] = [];
  try {
    words = fs
      .readFileSync(path.join(process.cwd(), 'backend', file), 'utf-8')
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => w && LETTERS_ONLY.test(w))
      .map((w) => fold(w, lang));
  } catch {
    words = [];
  }
  const out = [...new Set(words)];
  if (!out.length) throw new Error(`arcade word pool empty for ${lang}`);
  cache.set(lang, out);
  return out;
}

export function themedWords(lang: string): string[] {
  return (GIFT_WORDS[lang] ?? []).map((w) => fold(w, lang)).filter((w) => LETTERS_ONLY.test(w));
}
