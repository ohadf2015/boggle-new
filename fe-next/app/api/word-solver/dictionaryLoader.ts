/**
 * Shared dictionary loader for word-solver API
 * Reuses the same sources as /api/dictionary-words
 */

import * as fs from 'fs';
import * as path from 'path';
import { normalizeHebrewWord } from '@/shared/utils/wordNormalization';

export async function loadDictionaryWords(language: string): Promise<string[]> {
  switch (language) {
    case 'en': {
      const englishWords: string[] = require('an-array-of-english-words');
      return englishWords.map(w => w.toLowerCase());
    }

    case 'es': {
      const spanishWords: string[] = require('an-array-of-spanish-words');
      return spanishWords.map(w => w.toLowerCase());
    }

    case 'he': {
      const backendDir = path.join(process.cwd(), 'backend');
      const mainFile = path.join(backendDir, 'hebrew_words.txt');
      const approvedFile = path.join(backendDir, 'hebrew_words_approved.txt');
      const wordSet = new Set<string>();

      for (const filePath of [mainFile, approvedFile]) {
        if (fs.existsSync(filePath)) {
          fs.readFileSync(filePath, 'utf-8')
            .split('\n')
            .map(w => normalizeHebrewWord(w.trim()))
            .filter(w => w.length > 0)
            .forEach(w => wordSet.add(w));
        }
      }
      return Array.from(wordSet);
    }

    case 'sv': {
      const swedishWordsPath = path.join(process.cwd(), 'node_modules/@arvidbt/swedish-words/out/index.js');
      const approvedFile = path.join(process.cwd(), 'backend', 'swedish_words_approved.txt');
      const wordSet = new Set<string>();
      const validSwedishWordPattern = /^[a-zåäöéàü]+$/i;

      if (fs.existsSync(swedishWordsPath)) {
        const content = fs.readFileSync(swedishWordsPath, 'utf-8');
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

      if (fs.existsSync(approvedFile)) {
        fs.readFileSync(approvedFile, 'utf-8')
          .split('\n')
          .map(w => w.trim().toLowerCase())
          .filter(w => w.length > 0)
          .forEach(w => wordSet.add(w));
      }
      return Array.from(wordSet);
    }

    case 'ja': {
      const backendDir = path.join(process.cwd(), 'backend');
      const kanjiFile = path.join(backendDir, 'kanji_compounds.txt');
      const approvedFile = path.join(backendDir, 'japanese_words_approved.txt');
      const wordSet = new Set<string>();

      for (const filePath of [kanjiFile, approvedFile]) {
        if (fs.existsSync(filePath)) {
          fs.readFileSync(filePath, 'utf-8')
            .split('\n')
            .map(w => w.trim())
            .filter(w => w.length > 0)
            .forEach(w => wordSet.add(w));
        }
      }
      return Array.from(wordSet);
    }

    default:
      return [];
  }
}
