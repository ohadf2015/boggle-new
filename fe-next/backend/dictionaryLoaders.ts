/**
 * Dictionary Language Loaders
 * Per-language dictionary loading logic extracted from Dictionary class
 */

import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import logger from './utils/logger';
import {
  normalizeHebrewWord,
  normalizeSpanishWord,
} from '@/shared/utils/wordNormalization';

export type SafeReadFile = (filePath: string) => Promise<string>;

export function createSafeReadFile(): SafeReadFile {
  return async (filePath: string): Promise<string> => {
    try {
      if (fs.existsSync(filePath)) {
        return await fsp.readFile(filePath, 'utf-8');
      }
    } catch (e: unknown) {
      const error = e as Error;
      logger.warn('DICT', `Could not read ${filePath}: ${error.message}`);
    }
    return '';
  };
}

function mergeApprovedWords(
  dictionary: Set<string>,
  content: string,
  langLabel: string,
  normalizer: (w: string) => string = (w) => w.trim().toLowerCase()
): void {
  if (!content) return;
  const approvedWords = content.split('\n').map(normalizer).filter(w => w.length > 0);
  let count = 0;
  for (const word of approvedWords) {
    if (!dictionary.has(word)) {
      dictionary.add(word);
      count++;
    }
  }
  if (count > 0) {
    logger.debug('DICT', `Loaded ${count} community-approved ${langLabel} words`);
  }
}

export async function loadEnglishDictionary(
  safeReadFile: SafeReadFile
): Promise<Set<string>> {
  // Use require() for JSON packages — the esbuild CJS bundle has require() natively,
  // avoiding the import attribute issue that breaks dynamic import() on Node 22
  const englishWords: string[] = require('an-array-of-english-words');
  const dict = new Set(englishWords.map(w => w.toLowerCase()));
  logger.debug('DICT', `Loaded ${dict.size} English words from main dictionary`);

  const approvedContent = await safeReadFile(path.join(__dirname, 'english_words_approved.txt'));
  mergeApprovedWords(dict, approvedContent, 'English');
  logger.debug('DICT', `Total English words: ${dict.size}`);
  return dict;
}

export async function loadHebrewDictionary(
  safeReadFile: SafeReadFile
): Promise<Set<string>> {
  const [hebrewContent, hebrewApprovedContent] = await Promise.all([
    safeReadFile(path.join(__dirname, 'hebrew_words.txt')),
    safeReadFile(path.join(__dirname, 'hebrew_words_approved.txt')),
  ]);

  let dict = new Set<string>();
  if (hebrewContent) {
    const words = hebrewContent.split('\n').map(w => w.trim()).filter(w => w.length > 0).map(w => normalizeHebrewWord(w));
    dict = new Set(words);
    logger.debug('DICT', `Loaded ${dict.size} Hebrew words from main dictionary`);
  }

  mergeApprovedWords(dict, hebrewApprovedContent, 'Hebrew', (w) => normalizeHebrewWord(w.trim()));
  logger.debug('DICT', `Total Hebrew words: ${dict.size}`);
  return dict;
}

export async function loadSwedishDictionary(
  safeReadFile: SafeReadFile
): Promise<Set<string>> {
  const [swedishFileContent, swedishApprovedContent] = await Promise.all([
    safeReadFile(path.join(__dirname, 'node_modules/@arvidbt/swedish-words/out/index.js')).then(content =>
      content || safeReadFile(path.join(__dirname, '../node_modules/@arvidbt/swedish-words/out/index.js'))
    ),
    safeReadFile(path.join(__dirname, 'swedish_words_approved.txt')),
  ]);

  let dict = new Set<string>();

  if (swedishFileContent) {
    try {
      const arrayMatch = swedishFileContent.match(/var swedish_words = \[([\s\S]*?)\];/);
      if (arrayMatch) {
        const arrayContent = arrayMatch[1];
        const decodeJsEscapes = (str: string): string | null => {
          // Convert \xNN to actual characters, then parse as JSON string
          const decoded = str.replace(/\\x([0-9A-Fa-f]{2})/g, (_match, hex) =>
            String.fromCharCode(parseInt(hex, 16))
          );
          try { return JSON.parse(decoded); }
          catch { return null; }
        };

        const validSwedishWordPattern = /^[a-zåäöéàü]+$/i;
        const words = arrayContent
          .split(',')
          .map(line => {
            const trimmed = line.trim();
            if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) return null;
            return decodeJsEscapes(trimmed);
          })
          .filter((w): w is string => w !== null && w.length > 1 && validSwedishWordPattern.test(w));

        dict = new Set(words.map(w => w.toLowerCase()));
        logger.debug('DICT', `Loaded ${dict.size} Swedish words from main dictionary`);

        mergeApprovedWords(dict, swedishApprovedContent, 'Swedish');
        logger.debug('DICT', `Total Swedish words: ${dict.size}`);
      }
    } catch (error) {
      logger.error('DICT', `Error processing Swedish dictionary: ${error}`);
    }
  }

  return dict;
}

// Pure-hiragana (incl. small kana / dakuten) + the long-vowel mark ー (U+30FC).
// Excludes katakana and kanji so junk fragments (`あるクロ`, `ある三里`) never enter
// the validation set.
const HIRAGANA_WORD_RE = /^[぀-ゟー]+$/;

/**
 * Japanese validation dictionary = pure-HIRAGANA words.
 *
 * Boards (Boggle grid + WheelRush) are hiragana, so the validation set must be
 * hiragana. The primary source `japanese_words.txt` (~9.4k clean hiragana words)
 * was previously loaded by nobody; we wire it here. The 128k kanji compounds are
 * returned only as `compounds` for the legacy board-seeding consumer
 * (`Dictionary.kanjiCompounds` / `getRandomKanjiCompounds`) — they are NOT
 * reachable on a kana grid and never enter validation.
 * See docs/2026-05-21-japanese-multiplayer-gameplay-audit.md.
 */
export async function loadJapaneseDictionary(
  safeReadFile: SafeReadFile
): Promise<{ words: Set<string>; compounds: string[] }> {
  const [hiraganaContent, kanjiContent, japaneseApprovedContent] = await Promise.all([
    safeReadFile(path.join(__dirname, 'japanese_words.txt')),
    safeReadFile(path.join(__dirname, 'kanji_compounds.txt')),
    safeReadFile(path.join(__dirname, 'japanese_words_approved.txt')),
  ]);

  const dict = new Set<string>();
  const addHiragana = (content: string) => {
    if (!content) return;
    for (const raw of content.split('\n')) {
      const w = raw.trim();
      if (w.length > 0 && HIRAGANA_WORD_RE.test(w)) dict.add(w);
    }
  };

  try {
    addHiragana(hiraganaContent);
    addHiragana(japaneseApprovedContent); // clean hiragana entries from the community list
  } catch (error) {
    logger.error('DICT', `Error processing Japanese hiragana dictionary: ${error}`);
  }

  const compounds = kanjiContent
    ? kanjiContent.split('\n').map(w => w.trim()).filter(w => w.length > 0)
    : [];

  logger.debug('DICT', `Loaded ${dict.size} Japanese hiragana words; ${compounds.length} kanji compounds (seeding only)`);
  return { words: dict, compounds };
}

/**
 * Load noun-only word list for a language (used for board seeding).
 * Falls back to empty set if file doesn't exist — board generation
 * will use the full dictionary as fallback.
 */
export async function loadNounList(
  safeReadFile: SafeReadFile,
  language: string,
  normalizer: (w: string) => string = (w) => w.trim().toLowerCase()
): Promise<Set<string>> {
  const filePath = path.join(__dirname, `${language}_nouns.txt`);
  const content = await safeReadFile(filePath);
  if (!content) return new Set();

  const words = content.split('\n').map(w => normalizer(w)).filter(w => w.length > 0);
  const dict = new Set(words);
  logger.debug('DICT', `Loaded ${dict.size} ${language} nouns for board seeding`);
  return dict;
}

export async function loadSpanishDictionary(
  safeReadFile: SafeReadFile
): Promise<Set<string>> {
  const spanishWords: string[] = require('an-array-of-spanish-words');
  // Normalize at load (accent-strip, ñ-preserve) so the Set matches validate-time
  // normalizeSpanishWord. Without this, an auto-promoted accented word would be
  // stored accented yet every lookup is accent-stripped → permanently unreachable.
  const dict = new Set(spanishWords.map(w => normalizeSpanishWord(w)));
  logger.debug('DICT', `Loaded ${dict.size} Spanish words from main dictionary`);

  const approvedContent = await safeReadFile(path.join(__dirname, 'spanish_words_approved.txt'));
  mergeApprovedWords(dict, approvedContent, 'Spanish', (w) => normalizeSpanishWord(w.trim()));
  logger.debug('DICT', `Total Spanish words: ${dict.size}`);
  return dict;
}
