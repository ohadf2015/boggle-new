/**
 * Shared dictionary loader for word-solver API
 * Reuses the same sources as /api/dictionary-words
 */

import * as fs from 'fs';
import * as path from 'path';
import { normalizeHebrewWord } from '@/shared/utils/wordNormalization';

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
    case 'en': {
      const englishWords = require('an-array-of-english-words') as string[];
      result = englishWords.map(w => w.toLowerCase());
      cache[language] = result;
      return result;
    }

    case 'es': {
      const spanishWords = require('an-array-of-spanish-words') as string[];
      const wordSet = new Set<string>(spanishWords.map(w => w.toLowerCase()));
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
      const backendDir = path.join(process.cwd(), 'backend');
      const mainFile = path.join(backendDir, 'hebrew_words.txt');
      const approvedFile = path.join(backendDir, 'hebrew_words_approved.txt');
      const wordSet = new Set<string>();

      for (const filePath of [mainFile, approvedFile]) {
        const content = await readFileIfExists(filePath);
        if (content) {
          content
            .split('\n')
            .map(w => normalizeHebrewWord(w.trim()))
            .filter(w => w.length > 0)
            .forEach(w => wordSet.add(w));
        }
      }
      result = Array.from(wordSet);
      cache[language] = result;
      return result;
    }

    case 'sv': {
      const swedishWordsPath = path.join(process.cwd(), 'node_modules/@arvidbt/swedish-words/out/index.js');
      const approvedFile = path.join(process.cwd(), 'backend', 'swedish_words_approved.txt');
      const wordSet = new Set<string>();
      const validSwedishWordPattern = /^[a-zåäöéàü]+$/i;

      const content = await readFileIfExists(swedishWordsPath);
      if (content) {
        const arrayMatch = content.match(/var swedish_words = \[([\s\S]*?)\];/);
        if (arrayMatch) {
          arrayMatch[1].split(',').forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
              try {
                const jsonCompatible = trimmed.replace(/\\x([0-9A-Fa-f]{2})/g, '\\u00$1');
                const word = JSON.parse(jsonCompatible);
                if (word && word.length > 1 && validSwedishWordPattern.test(word)) {
                  wordSet.add(word.toLowerCase());
                }
              } catch {
                // Skip invalid entries
              }
            }
          });
        }
      }

      const approvedContent = await readFileIfExists(approvedFile);
      if (approvedContent) {
        approvedContent
          .split('\n')
          .map(w => w.trim().toLowerCase())
          .filter(w => w.length > 0)
          .forEach(w => wordSet.add(w));
      }
      result = Array.from(wordSet);
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
