/**
 * Shared dictionary loader for word-solver API
 * Reuses the same sources as /api/dictionary-words
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getEnglishWordSet,
  getSpanishBaseWordSet,
  getHebrewWordSet,
  getSwedishWordSet,
} from '@/lib/server/sharedWordSets';

const cache: Record<string, string[]> = {};

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export async function loadDictionaryWords(language: string): Promise<string[]> {
  if (cache[language]) return cache[language];

  let result: string[];

  switch (language) {
    // en/he/sv share the process-wide canonical sets (same membership as before);
    // Array.from() reuses the shared string objects, so only a lightweight pointer
    // array is per-consumer (see lib/server/sharedWordSets.ts — OOM 2026-08-06).
    case 'en': {
      result = Array.from(await getEnglishWordSet());
      cache[language] = result;
      return result;
    }

    case 'es': {
      // Base (shared) + word-solver's community-approved additions, layered on a
      // copy so the shared base set stays untouched.
      const wordSet = new Set<string>(await getSpanishBaseWordSet());
      const approvedFile = path.join(process.cwd(), 'backend', 'spanish_words_approved.txt');
      const approvedContent = await readFileIfExists(approvedFile);
      if (approvedContent) {
        approvedContent
          .split('\n')
          .map(w => w.trim().toLowerCase())
          .filter(w => w.length > 0 && !w.startsWith('#'))
          .forEach(w => wordSet.add(w));
      }
      result = Array.from(wordSet);
      cache[language] = result;
      return result;
    }

    case 'he': {
      result = Array.from(getHebrewWordSet());
      cache[language] = result;
      return result;
    }

    case 'sv': {
      result = Array.from(getSwedishWordSet());
      cache[language] = result;
      return result;
    }

    case 'ja': {
      const backendDir = path.join(process.cwd(), 'backend');
      const kanjiFile = path.join(backendDir, 'kanji_compounds.txt');
      const approvedFile = path.join(backendDir, 'japanese_words_approved.txt');
      const wordSet = new Set<string>();

      for (const filePath of [kanjiFile, approvedFile]) {
        const content = await readFileIfExists(filePath);
        if (content) {
          content
            .split('\n')
            .map(w => w.trim())
            .filter(w => w.length > 0)
            .forEach(w => wordSet.add(w));
        }
      }
      result = Array.from(wordSet);
      cache[language] = result;
      return result;
    }

    default:
      return [];
  }
}
