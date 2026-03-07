import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import type { Language } from '@/shared/types';
import logger from './utils/logger';
import { getThemedWords, getCurrentTheme } from './data/dateThemedWords';
import {
  normalizeHebrewWord,
  isValidHebrewLetter,
} from '@/shared/utils/wordNormalization';

const appendFileAsync = promisify(fs.appendFile);

// Check if a word contains only valid Hebrew letters (no punctuation like gershayim ״ or geresh ׳)
function isValidHebrewWordForBoard(word: string): boolean {
  return word.split('').every(char => isValidHebrewLetter(char));
}

// Spanish accent normalization - accented vowels to base vowels for dictionary lookup
// Note: Ñ is kept as-is since it exists in the dictionary as a distinct letter
const spanishAccentMap: Record<string, string> = {
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u'
};

function normalizeSpanishLetter(letter: string): string {
  const lower = letter.toLowerCase();
  return spanishAccentMap[lower] || lower;
}

function normalizeSpanishWord(word: string): string {
  return word.split('').map(c => {
    const lower = c.toLowerCase();
    return spanishAccentMap[lower] || lower;
  }).join('');
}

interface ThemeInfo {
  nameKey: string;
  emoji: string;
  isHoliday: boolean;
}

interface ThemedWordsResult {
  words: string[];
  theme: ThemeInfo;
}

interface LanguageConfig {
  dictionary: Set<string>;
  approvedFile: string;
}

// Memory tracking for dictionaries
interface DictionaryMemoryStats {
  language: Language;
  wordCount: number;
  estimatedBytes: number;
  lastAccessed: number;
}

class Dictionary {
  englishWords: Set<string>;
  hebrewWords: Set<string>;
  swedishWords: Set<string>;
  japaneseWords: Set<string>;
  spanishWords: Set<string>;
  kanjiCompounds: string[];
  loaded: boolean; // @deprecated - use loadedLanguages instead
  loadedLanguages: Set<Language>; // Track which languages are loaded
  loadingPromises: Map<Language, Promise<void>>; // Prevent duplicate loading
  lastAccessTime: Map<Language, number>; // Track last access for potential unloading

  constructor() {
    this.englishWords = new Set();
    this.hebrewWords = new Set();
    this.swedishWords = new Set();
    this.japaneseWords = new Set();
    this.spanishWords = new Set();
    this.kanjiCompounds = []; // Array of valid Kanji compounds for board generation
    this.loaded = false;
    this.loadedLanguages = new Set();
    this.loadingPromises = new Map();
    this.lastAccessTime = new Map();
  }

  /**
   * Get memory usage statistics for all loaded dictionaries
   */
  getMemoryStats(): DictionaryMemoryStats[] {
    const stats: DictionaryMemoryStats[] = [];
    const avgBytesPerWord = 12; // Average word length ~6 chars × 2 bytes (UTF-16) + Set overhead

    if (this.loadedLanguages.has('en')) {
      stats.push({
        language: 'en',
        wordCount: this.englishWords.size,
        estimatedBytes: this.englishWords.size * avgBytesPerWord,
        lastAccessed: this.lastAccessTime.get('en') || 0
      });
    }
    if (this.loadedLanguages.has('he')) {
      stats.push({
        language: 'he',
        wordCount: this.hebrewWords.size,
        estimatedBytes: this.hebrewWords.size * avgBytesPerWord,
        lastAccessed: this.lastAccessTime.get('he') || 0
      });
    }
    if (this.loadedLanguages.has('sv')) {
      stats.push({
        language: 'sv',
        wordCount: this.swedishWords.size,
        estimatedBytes: this.swedishWords.size * avgBytesPerWord,
        lastAccessed: this.lastAccessTime.get('sv') || 0
      });
    }
    if (this.loadedLanguages.has('ja')) {
      stats.push({
        language: 'ja',
        wordCount: this.japaneseWords.size,
        estimatedBytes: this.japaneseWords.size * avgBytesPerWord,
        lastAccessed: this.lastAccessTime.get('ja') || 0
      });
    }
    if (this.loadedLanguages.has('es')) {
      stats.push({
        language: 'es',
        wordCount: this.spanishWords.size,
        estimatedBytes: this.spanishWords.size * avgBytesPerWord,
        lastAccessed: this.lastAccessTime.get('es') || 0
      });
    }

    return stats;
  }

  /**
   * Get total estimated memory usage in bytes
   */
  getTotalMemoryUsage(): number {
    return this.getMemoryStats().reduce((sum, stat) => sum + stat.estimatedBytes, 0);
  }

  /**
   * Unload a language dictionary to free memory
   * Note: English cannot be unloaded as it's the default fallback
   */
  unloadLanguage(language: Language): boolean {
    if (language === 'en') {
      logger.warn('DICT', 'Cannot unload English dictionary - it is the default fallback');
      return false;
    }

    if (!this.loadedLanguages.has(language)) {
      return false; // Already not loaded
    }

    const beforeSize = this.getTotalMemoryUsage();

    switch (language) {
      case 'he':
        this.hebrewWords = new Set();
        break;
      case 'sv':
        this.swedishWords = new Set();
        break;
      case 'ja':
        this.japaneseWords = new Set();
        this.kanjiCompounds = [];
        break;
      case 'es':
        this.spanishWords = new Set();
        break;
    }

    this.loadedLanguages.delete(language);
    this.lastAccessTime.delete(language);

    const afterSize = this.getTotalMemoryUsage();
    const freedBytes = beforeSize - afterSize;
    logger.info('DICT', `Unloaded ${language} dictionary, freed ~${Math.round(freedBytes / 1024)}KB`);

    return true;
  }

  /**
   * Unload dictionaries that haven't been accessed in the specified time
   * @param maxIdleMs - Maximum idle time in milliseconds (default: 30 minutes)
   */
  unloadIdleDictionaries(maxIdleMs: number = 30 * 60 * 1000): Language[] {
    const now = Date.now();
    const unloaded: Language[] = [];

    for (const [language, lastAccess] of this.lastAccessTime.entries()) {
      if (language !== 'en' && now - lastAccess > maxIdleMs) {
        if (this.unloadLanguage(language)) {
          unloaded.push(language);
        }
      }
    }

    if (unloaded.length > 0) {
      logger.info('DICT', `Unloaded ${unloaded.length} idle dictionaries: ${unloaded.join(', ')}`);
    }

    return unloaded;
  }

  /**
   * Load only English dictionary for fast startup
   * Other languages will be lazy-loaded on first use
   * This saves ~60% memory on startup
   */
  async loadEnglishOnly(): Promise<void> {
    if (this.loadedLanguages.has('en')) {
      return;
    }

    logger.info('DICT', 'Loading English dictionary only (lazy loading enabled for other languages)...');
    const startTime = Date.now();

    try {
      const safeReadFile = async (filePath: string): Promise<string> => {
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

      await this.loadEnglishDictionary(safeReadFile);
      this.loadedLanguages.add('en');
      this.lastAccessTime.set('en', Date.now());
      this.loaded = true; // Backward compatibility

      const loadTime = Date.now() - startTime;
      logger.info('DICT', `English dictionary loaded in ${loadTime}ms (other languages will be lazy-loaded)`);
    } catch (error) {
      logger.error('DICT', `Error loading English dictionary: ${error}`);
    }
  }

  /**
   * Load all dictionaries at once (original behavior)
   * Consider using loadEnglishOnly() for faster startup
   */
  async load(): Promise<void> {
    if (this.loaded) {
      return;
    }

    logger.info('DICT', 'Loading all dictionaries in parallel...');
    const startTime = Date.now();

    try {
      // Define file paths
      const hebrewFilePath = path.join(__dirname, 'hebrew_words.txt');
      const hebrewApprovedFilePath = path.join(__dirname, 'hebrew_words_approved.txt');
      const englishApprovedFilePath = path.join(__dirname, 'english_words_approved.txt');
      const swedishWordsPath = path.join(__dirname, '../node_modules/@arvidbt/swedish-words/out/index.js');
      const swedishApprovedFilePath = path.join(__dirname, 'swedish_words_approved.txt');
      const kanjiFilePath = path.join(__dirname, 'kanji_compounds.txt');
      const japaneseApprovedFilePath = path.join(__dirname, 'japanese_words_approved.txt');
      const spanishApprovedFilePath = path.join(__dirname, 'spanish_words_approved.txt');

      // Helper to safely read a file (returns empty string if not exists)
      const safeReadFile = async (filePath: string): Promise<string> => {
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

      // Load all files in parallel for 70-80% faster startup
      const [
        hebrewContent,
        hebrewApprovedContent,
        englishApprovedContent,
        swedishFileContent,
        swedishApprovedContent,
        kanjiContent,
        japaneseApprovedContent,
        spanishApprovedContent,
      ] = await Promise.all([
        safeReadFile(hebrewFilePath),
        safeReadFile(hebrewApprovedFilePath),
        safeReadFile(englishApprovedFilePath),
        safeReadFile(swedishWordsPath),
        safeReadFile(swedishApprovedFilePath),
        safeReadFile(kanjiFilePath),
        safeReadFile(japaneseApprovedFilePath),
        safeReadFile(spanishApprovedFilePath),
      ]);

      // Process English words (synchronous require, but fast)
      const englishWords: string[] = require('an-array-of-english-words');
      this.englishWords = new Set(englishWords.map(w => w.toLowerCase()));
      const englishMainCount = this.englishWords.size;
      logger.debug('DICT', `Loaded ${englishMainCount} English words from main dictionary`);

      // Process community-approved English words
      if (englishApprovedContent) {
        const approvedWords = englishApprovedContent
          .split('\n')
          .map(w => w.trim().toLowerCase())
          .filter(w => w.length > 0);

        let englishApprovedCount = 0;
        for (const word of approvedWords) {
          if (!this.englishWords.has(word)) {
            this.englishWords.add(word);
            englishApprovedCount++;
          }
        }
        if (englishApprovedCount > 0) {
          logger.debug('DICT', `Loaded ${englishApprovedCount} community-approved English words`);
        }
      }
      logger.debug('DICT', `Total English words: ${this.englishWords.size}`);

      // Process Hebrew words
      if (hebrewContent) {
        const hebrewWords = hebrewContent
          .split('\n')
          .map(w => w.trim())
          .filter(w => w.length > 0)
          .map(w => normalizeHebrewWord(w));

        this.hebrewWords = new Set(hebrewWords);
        const mainCount = this.hebrewWords.size;
        logger.debug('DICT', `Loaded ${mainCount} Hebrew words from main dictionary`);
      }

      // Process community-approved Hebrew words
      if (hebrewApprovedContent) {
        const approvedWords = hebrewApprovedContent
          .split('\n')
          .map(w => w.trim())
          .filter(w => w.length > 0)
          .map(w => normalizeHebrewWord(w));

        let approvedCount = 0;
        for (const word of approvedWords) {
          if (!this.hebrewWords.has(word)) {
            this.hebrewWords.add(word);
            approvedCount++;
          }
        }
        if (approvedCount > 0) {
          logger.debug('DICT', `Loaded ${approvedCount} community-approved Hebrew words`);
        }
      }
      logger.debug('DICT', `Total Hebrew words: ${this.hebrewWords.size}`);

      // Process Swedish words
      if (swedishFileContent) {
        try {
          const arrayMatch = swedishFileContent.match(/var swedish_words = \[([\s\S]*?)\];/);

          if (arrayMatch) {
            const arrayContent = arrayMatch[1];

            // Helper function to decode JavaScript escape sequences (e.g., \xE5 -> å)
            const decodeJsEscapes = (str: string): string | null => {
              // Convert \xNN to \u00NN for JSON compatibility
              const jsonCompatible = str.replace(/\\x([0-9A-Fa-f]{2})/g, '\\u00$1');
              try {
                return JSON.parse(jsonCompatible);
              } catch {
                return null;
              }
            };

            // Valid Swedish word pattern - only alphabetic characters (including å, ä, ö)
            const validSwedishWordPattern = /^[a-zåäöéàü]+$/i;

            const words = arrayContent
              .split(',')
              .map(line => {
                const trimmed = line.trim();
                if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) return null;
                return decodeJsEscapes(trimmed);
              })
              .filter((w): w is string => w !== null && w.length > 1 && validSwedishWordPattern.test(w));

            this.swedishWords = new Set(words.map(w => w.toLowerCase()));
            const swedishMainCount = this.swedishWords.size;
            logger.debug('DICT', `Loaded ${swedishMainCount} Swedish words from main dictionary`);

            // Process community-approved Swedish words
            if (swedishApprovedContent) {
              const approvedWords = swedishApprovedContent
                .split('\n')
                .map(w => w.trim().toLowerCase())
                .filter(w => w.length > 0);

              let swedishApprovedCount = 0;
              for (const word of approvedWords) {
                if (!this.swedishWords.has(word)) {
                  this.swedishWords.add(word);
                  swedishApprovedCount++;
                }
              }
              if (swedishApprovedCount > 0) {
                logger.debug('DICT', `Loaded ${swedishApprovedCount} community-approved Swedish words`);
              }
            }
            logger.debug('DICT', `Total Swedish words: ${this.swedishWords.size}`);
          } else {
            logger.warn('DICT', 'Could not parse Swedish dictionary - using fallback validation');
          }
        } catch (swedishError: unknown) {
          const error = swedishError as Error;
          logger.error('DICT', `Error processing Swedish dictionary: ${error.message}`);
        }
      }

      // Process Japanese Kanji compounds
      if (kanjiContent) {
        try {
          const kanjiCompounds = kanjiContent
            .split('\n')
            .map(w => w.trim())
            .filter(w => w.length > 0);

          this.japaneseWords = new Set(kanjiCompounds);
          this.kanjiCompounds = kanjiCompounds;
          const japaneseMainCount = this.japaneseWords.size;
          logger.debug('DICT', `Loaded ${japaneseMainCount} Japanese Kanji compounds from main dictionary`);

          // Process community-approved Japanese words
          if (japaneseApprovedContent) {
            const approvedWords = japaneseApprovedContent
              .split('\n')
              .map(w => w.trim())
              .filter(w => w.length > 0);

            let japaneseApprovedCount = 0;
            for (const word of approvedWords) {
              if (!this.japaneseWords.has(word)) {
                this.japaneseWords.add(word);
                japaneseApprovedCount++;
              }
            }
            if (japaneseApprovedCount > 0) {
              logger.debug('DICT', `Loaded ${japaneseApprovedCount} community-approved Japanese words`);
            }
          }
          logger.debug('DICT', `Total Japanese words: ${this.japaneseWords.size}`);
        } catch (japaneseError) {
          logger.error('DICT', `Error processing Japanese Kanji compounds: ${japaneseError}`);
        }
      }

      // Process Spanish words (from npm package, similar to English)
      const spanishWords: string[] = require('an-array-of-spanish-words');
      this.spanishWords = new Set(spanishWords.map(w => w.toLowerCase()));
      const spanishMainCount = this.spanishWords.size;
      logger.debug('DICT', `Loaded ${spanishMainCount} Spanish words from main dictionary`);

      // Process community-approved Spanish words
      if (spanishApprovedContent) {
        const approvedWords = spanishApprovedContent
          .split('\n')
          .map(w => w.trim().toLowerCase())
          .filter(w => w.length > 0);

        let spanishApprovedCount = 0;
        for (const word of approvedWords) {
          if (!this.spanishWords.has(word)) {
            this.spanishWords.add(word);
            spanishApprovedCount++;
          }
        }
        if (spanishApprovedCount > 0) {
          logger.debug('DICT', `Loaded ${spanishApprovedCount} community-approved Spanish words`);
        }
      }
      logger.debug('DICT', `Total Spanish words: ${this.spanishWords.size}`);

      this.loaded = true;
      // Mark all languages as loaded since load() loads all of them
      this.loadedLanguages.add('en');
      this.loadedLanguages.add('he');
      this.loadedLanguages.add('sv');
      this.loadedLanguages.add('ja');
      this.loadedLanguages.add('es');
      const loadTime = Date.now() - startTime;
      logger.info('DICT', `All dictionaries loaded in ${loadTime}ms`);
    } catch (error) {
      logger.error('DICT', `Error loading dictionaries: ${error}`);
      // Continue without dictionaries - fall back to manual validation
    }
  }

  /**
   * Lazy load a specific language dictionary on demand
   * Returns immediately if already loaded or loading
   */
  async ensureLanguageLoaded(language: Language): Promise<void> {
    // Already loaded - update access time
    if (this.loadedLanguages.has(language)) {
      this.lastAccessTime.set(language, Date.now());
      return;
    }

    // Already loading - return existing promise
    if (this.loadingPromises.has(language)) {
      return this.loadingPromises.get(language);
    }

    // Start loading
    const loadPromise = this.loadLanguage(language);
    this.loadingPromises.set(language, loadPromise);

    try {
      await loadPromise;
      this.loadedLanguages.add(language);
      this.lastAccessTime.set(language, Date.now());
    } finally {
      this.loadingPromises.delete(language);
    }
  }

  /**
   * Load a specific language dictionary
   */
  private async loadLanguage(language: Language): Promise<void> {
    const startTime = Date.now();
    logger.info('DICT', `Lazy loading ${language} dictionary...`);

    try {
      const safeReadFile = async (filePath: string): Promise<string> => {
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

      switch (language) {
        case 'en':
          await this.loadEnglishDictionary(safeReadFile);
          break;
        case 'he':
          await this.loadHebrewDictionary(safeReadFile);
          break;
        case 'sv':
          await this.loadSwedishDictionary(safeReadFile);
          break;
        case 'ja':
          await this.loadJapaneseDictionary(safeReadFile);
          break;
        case 'es':
          await this.loadSpanishDictionary(safeReadFile);
          break;
      }

      const loadTime = Date.now() - startTime;
      logger.info('DICT', `${language} dictionary loaded in ${loadTime}ms`);
    } catch (error) {
      logger.error('DICT', `Error loading ${language} dictionary: ${error}`);
    }
  }

  private async loadEnglishDictionary(safeReadFile: (path: string) => Promise<string>): Promise<void> {
    const englishWords: string[] = require('an-array-of-english-words');
    this.englishWords = new Set(englishWords.map(w => w.toLowerCase()));
    logger.debug('DICT', `Loaded ${this.englishWords.size} English words from main dictionary`);

    const englishApprovedFilePath = path.join(__dirname, 'english_words_approved.txt');
    const approvedContent = await safeReadFile(englishApprovedFilePath);

    if (approvedContent) {
      const approvedWords = approvedContent.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
      let approvedCount = 0;
      for (const word of approvedWords) {
        if (!this.englishWords.has(word)) {
          this.englishWords.add(word);
          approvedCount++;
        }
      }
      if (approvedCount > 0) {
        logger.debug('DICT', `Loaded ${approvedCount} community-approved English words`);
      }
    }
    logger.debug('DICT', `Total English words: ${this.englishWords.size}`);
  }

  private async loadHebrewDictionary(safeReadFile: (path: string) => Promise<string>): Promise<void> {
    const hebrewFilePath = path.join(__dirname, 'hebrew_words.txt');
    const hebrewApprovedFilePath = path.join(__dirname, 'hebrew_words_approved.txt');

    const [hebrewContent, hebrewApprovedContent] = await Promise.all([
      safeReadFile(hebrewFilePath),
      safeReadFile(hebrewApprovedFilePath),
    ]);

    if (hebrewContent) {
      const hebrewWords = hebrewContent.split('\n').map(w => w.trim()).filter(w => w.length > 0).map(w => normalizeHebrewWord(w));
      this.hebrewWords = new Set(hebrewWords);
      logger.debug('DICT', `Loaded ${this.hebrewWords.size} Hebrew words from main dictionary`);
    }

    if (hebrewApprovedContent) {
      const approvedWords = hebrewApprovedContent.split('\n').map(w => w.trim()).filter(w => w.length > 0).map(w => normalizeHebrewWord(w));
      let approvedCount = 0;
      for (const word of approvedWords) {
        if (!this.hebrewWords.has(word)) {
          this.hebrewWords.add(word);
          approvedCount++;
        }
      }
      if (approvedCount > 0) {
        logger.debug('DICT', `Loaded ${approvedCount} community-approved Hebrew words`);
      }
    }
    logger.debug('DICT', `Total Hebrew words: ${this.hebrewWords.size}`);
  }

  private async loadSwedishDictionary(safeReadFile: (path: string) => Promise<string>): Promise<void> {
    const swedishWordsPath = path.join(__dirname, '../node_modules/@arvidbt/swedish-words/out/index.js');
    const swedishApprovedFilePath = path.join(__dirname, 'swedish_words_approved.txt');

    const [swedishFileContent, swedishApprovedContent] = await Promise.all([
      safeReadFile(swedishWordsPath),
      safeReadFile(swedishApprovedFilePath),
    ]);

    if (swedishFileContent) {
      try {
        const arrayMatch = swedishFileContent.match(/var swedish_words = \[([\s\S]*?)\];/);
        if (arrayMatch) {
          const arrayContent = arrayMatch[1];
          const decodeJsEscapes = (str: string): string | null => {
            const jsonCompatible = str.replace(/\\x([0-9A-Fa-f]{2})/g, '\\u00$1');
            try {
              return JSON.parse(jsonCompatible);
            } catch {
              return null;
            }
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

          this.swedishWords = new Set(words.map(w => w.toLowerCase()));
          logger.debug('DICT', `Loaded ${this.swedishWords.size} Swedish words from main dictionary`);

          if (swedishApprovedContent) {
            const approvedWords = swedishApprovedContent.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
            let approvedCount = 0;
            for (const word of approvedWords) {
              if (!this.swedishWords.has(word)) {
                this.swedishWords.add(word);
                approvedCount++;
              }
            }
            if (approvedCount > 0) {
              logger.debug('DICT', `Loaded ${approvedCount} community-approved Swedish words`);
            }
          }
          logger.debug('DICT', `Total Swedish words: ${this.swedishWords.size}`);
        }
      } catch (error) {
        logger.error('DICT', `Error processing Swedish dictionary: ${error}`);
      }
    }
  }

  private async loadJapaneseDictionary(safeReadFile: (path: string) => Promise<string>): Promise<void> {
    const kanjiFilePath = path.join(__dirname, 'kanji_compounds.txt');
    const japaneseApprovedFilePath = path.join(__dirname, 'japanese_words_approved.txt');

    const [kanjiContent, japaneseApprovedContent] = await Promise.all([
      safeReadFile(kanjiFilePath),
      safeReadFile(japaneseApprovedFilePath),
    ]);

    if (kanjiContent) {
      try {
        const kanjiCompounds = kanjiContent.split('\n').map(w => w.trim()).filter(w => w.length > 0);
        this.japaneseWords = new Set(kanjiCompounds);
        this.kanjiCompounds = kanjiCompounds;
        logger.debug('DICT', `Loaded ${this.japaneseWords.size} Japanese Kanji compounds from main dictionary`);

        if (japaneseApprovedContent) {
          const approvedWords = japaneseApprovedContent.split('\n').map(w => w.trim()).filter(w => w.length > 0);
          let approvedCount = 0;
          for (const word of approvedWords) {
            if (!this.japaneseWords.has(word)) {
              this.japaneseWords.add(word);
              approvedCount++;
            }
          }
          if (approvedCount > 0) {
            logger.debug('DICT', `Loaded ${approvedCount} community-approved Japanese words`);
          }
        }
        logger.debug('DICT', `Total Japanese words: ${this.japaneseWords.size}`);
      } catch (error) {
        logger.error('DICT', `Error processing Japanese Kanji compounds: ${error}`);
      }
    }
  }

  private async loadSpanishDictionary(safeReadFile: (path: string) => Promise<string>): Promise<void> {
    const spanishWords: string[] = require('an-array-of-spanish-words');
    this.spanishWords = new Set(spanishWords.map(w => w.toLowerCase()));
    logger.debug('DICT', `Loaded ${this.spanishWords.size} Spanish words from main dictionary`);

    const spanishApprovedFilePath = path.join(__dirname, 'spanish_words_approved.txt');
    const approvedContent = await safeReadFile(spanishApprovedFilePath);

    if (approvedContent) {
      const approvedWords = approvedContent.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
      let approvedCount = 0;
      for (const word of approvedWords) {
        if (!this.spanishWords.has(word)) {
          this.spanishWords.add(word);
          approvedCount++;
        }
      }
      if (approvedCount > 0) {
        logger.debug('DICT', `Loaded ${approvedCount} community-approved Spanish words`);
      }
    }
    logger.debug('DICT', `Total Spanish words: ${this.spanishWords.size}`);
  }

  isValidWord(word: string, language: Language): boolean | null {
    // Check if the specific language dictionary is loaded (new lazy loading approach)
    if (!this.loadedLanguages.has(language)) {
      // Language not loaded yet - caller should call ensureLanguageLoaded(language) and retry
      return null;
    }

    // Update access time for this language (for idle unloading)
    this.lastAccessTime.set(language, Date.now());

    // Backward compatibility: also check old global loaded flag
    if (!this.loaded && this.loadedLanguages.size === 0) {
      // If dictionaries aren't loaded at all, treat all words as unknown (require manual validation)
      return null;
    }

    let normalizedWord: string;
    let dictionary: Set<string>;

    switch (language) {
      case 'he':
        normalizedWord = normalizeHebrewWord(word);
        dictionary = this.hebrewWords;
        break;

      case 'sv':
        normalizedWord = word.toLowerCase();
        dictionary = this.swedishWords;
        break;

      case 'ja':
        normalizedWord = word; // Japanese doesn't need case normalization
        dictionary = this.japaneseWords;
        break;

      case 'es':
        normalizedWord = normalizeSpanishWord(word);
        dictionary = this.spanishWords;
        break;

      case 'en':
      default:
        normalizedWord = word.toLowerCase();
        dictionary = this.englishWords;
        break;
    }

    // Check static dictionary first
    if (dictionary.has(normalizedWord)) {
      return true;
    }

    // Check community-validated words (words with 6+ net votes)
    // Lazy require to avoid circular dependency
    try {
      const { isWordCommunityValid } = require('./modules/communityWordManager');
      if (isWordCommunityValid(normalizedWord, language)) {
        return true;
      }
    } catch (e) {
      // Community word manager not available yet (during initial load)
    }

    return false;
  }

  isValidEnglishWord(word: string): boolean | null {
    return this.isValidWord(word, 'en');
  }

  isValidHebrewWord(word: string): boolean | null {
    return this.isValidWord(word, 'he');
  }

  isValidSwedishWord(word: string): boolean | null {
    return this.isValidWord(word, 'sv');
  }

  isValidJapaneseWord(word: string): boolean | null {
    return this.isValidWord(word, 'ja');
  }

  isValidSpanishWord(word: string): boolean | null {
    return this.isValidWord(word, 'es');
  }

  // Get random Kanji compounds for board generation
  getRandomKanjiCompounds(count: number = 5, minLength: number = 2, maxLength: number = 4): string[] {
    if (!this.kanjiCompounds || this.kanjiCompounds.length === 0) {
      return [];
    }

    // Filter compounds by length
    const filteredCompounds = this.kanjiCompounds.filter(
      w => w.length >= minLength && w.length <= maxLength
    );

    if (filteredCompounds.length === 0) {
      return [];
    }

    // Shuffle and pick random compounds
    const shuffled = [...filteredCompounds].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  // Get random long words (4+ letters) for board embedding to enhance game experience
  getRandomLongWords(language: Language, count: number = 5, minLength: number = 4, maxLength: number = 8): string[] {
    let dictionary: Set<string>;
    let normalizer = (w: string): string => w;
    let validator = (_w: string): boolean => true; // Default: accept all words

    switch (language) {
      case 'he':
        dictionary = this.hebrewWords;
        // Filter out words with non-Hebrew characters (like gershayim ״ or geresh ׳)
        validator = isValidHebrewWordForBoard;
        break;
      case 'sv':
        dictionary = this.swedishWords;
        normalizer = (w: string): string => w.toUpperCase(); // Swedish board uses uppercase
        break;
      case 'en':
        dictionary = this.englishWords;
        normalizer = (w: string): string => w.toUpperCase(); // English board uses uppercase
        break;
      case 'es':
        dictionary = this.spanishWords;
        normalizer = (w: string): string => w.toUpperCase(); // Spanish board uses uppercase
        break;
      case 'ja':
        // Japanese uses Kanji compounds, handled separately
        return this.getRandomKanjiCompounds(count, minLength, maxLength);
      default:
        return [];
    }

    if (!dictionary || dictionary.size === 0) {
      return [];
    }

    // Filter words by length and validity (for Hebrew, exclude words with punctuation)
    const filteredWords = Array.from(dictionary).filter(
      w => w.length >= minLength && w.length <= maxLength && validator(w)
    );

    if (filteredWords.length === 0) {
      return [];
    }

    // Shuffle and pick random words
    const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length)).map(normalizer);
  }

  /**
   * Get random long words with 50% themed words based on current date
   * Returns both words and theme information for display
   * @param language - Language code (en, he, sv, es, ja)
   * @param count - Total number of words to return
   * @param minLength - Minimum word length
   * @param maxLength - Maximum word length (now supports up to 12)
   * @returns Object with words array and theme info
   */
  getRandomLongWordsWithTheme(
    language: Language,
    count: number = 10,
    minLength: number = 3,
    maxLength: number = 12
  ): ThemedWordsResult {
    // Get current theme and themed words (50% of total)
    const themedCount = Math.ceil(count / 2);
    const regularCount = count - themedCount;

    const themedResult = getThemedWords(language, themedCount, minLength, maxLength) as ThemedWordsResult;
    let themedWords = themedResult.words;

    // Normalize themed words based on language
    let normalizer = (w: string): string => w;
    if (language === 'en' || language === 'sv' || language === 'es') {
      normalizer = (w: string): string => w.toUpperCase();
    }
    themedWords = themedWords.map(normalizer);

    // Get regular dictionary words for the other 50%
    const regularWords = this.getRandomLongWords(language, regularCount, minLength, maxLength);

    // Combine and shuffle all words together
    const allWords = [...themedWords, ...regularWords];
    const shuffled = allWords.sort(() => Math.random() - 0.5);

    // Remove any duplicates while preserving order
    const uniqueWords = [...new Set(shuffled)];

    return {
      words: uniqueWords,
      theme: themedResult.theme
    };
  }
}

// Create a singleton instance
const dictionary = new Dictionary();

// Export wrapper functions for compatibility
function isDictionaryWord(word: string, language: Language): boolean | null {
  return dictionary.isValidWord(word, language);
}

function getAvailableDictionaries(): Language[] {
  return ['en', 'he', 'sv', 'ja', 'es'];
}

// Normalize word based on language
function normalizeWord(word: string, language: Language): string {
  switch (language) {
    case 'he':
      return normalizeHebrewWord(word);
    case 'es':
      return normalizeSpanishWord(word);
    case 'ja':
      return word; // Japanese doesn't need normalization
    case 'en':
    case 'sv':
    default:
      return word.toLowerCase();
  }
}

// Get the dictionary Set and approved file path for a language
function getLanguageConfig(language: Language): LanguageConfig {
  const configs: Record<string, LanguageConfig> = {
    en: {
      dictionary: dictionary.englishWords,
      approvedFile: 'english_words_approved.txt'
    },
    he: {
      dictionary: dictionary.hebrewWords,
      approvedFile: 'hebrew_words_approved.txt'
    },
    sv: {
      dictionary: dictionary.swedishWords,
      approvedFile: 'swedish_words_approved.txt'
    },
    ja: {
      dictionary: dictionary.japaneseWords,
      approvedFile: 'japanese_words_approved.txt'
    },
    es: {
      dictionary: dictionary.spanishWords,
      approvedFile: 'spanish_words_approved.txt'
    }
  };
  return configs[language] || configs.en;
}

// Add a community-approved word to the dictionary (both in-memory and file)
async function addApprovedWord(word: string, language: Language): Promise<boolean> {
  const config = getLanguageConfig(language);
  const normalizedWord = normalizeWord(word, language);

  // Check if already in dictionary
  if (config.dictionary.has(normalizedWord)) {
    return false; // Already exists
  }

  // Add to in-memory dictionary
  config.dictionary.add(normalizedWord);

  // Append to approved words file
  try {
    const approvedFilePath = path.join(__dirname, config.approvedFile);
    await appendFileAsync(approvedFilePath, normalizedWord + '\n', 'utf-8');
    logger.info('DICT', `Word "${word}" (${language}) promoted to community-approved dictionary`);
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('DICT', `Error appending approved word to file: ${err.message}`);
    // Word is still in memory, just not persisted
    return true;
  }
}

// Remove a community-approved word from the dictionary (both in-memory and file)
async function removeApprovedWord(word: string, language: Language): Promise<boolean> {
  const config = getLanguageConfig(language);
  const normalizedWord = normalizeWord(word, language);

  // Check if word exists in dictionary
  if (!config.dictionary.has(normalizedWord)) {
    return false;
  }

  // Remove from in-memory dictionary
  config.dictionary.delete(normalizedWord);

  // Rewrite approved file without the word (atomic: write tmp -> rename)
  try {
    const approvedFilePath = path.join(__dirname, config.approvedFile);

    if (fs.existsSync(approvedFilePath)) {
      const content = await fsp.readFile(approvedFilePath, 'utf-8');
      const words = content.split('\n').filter(w => {
        const trimmed = w.trim();
        if (!trimmed) return false;
        const normalizedLine = normalizeWord(trimmed, language);
        return normalizedLine !== normalizedWord;
      });

      const tmpPath = approvedFilePath + '.tmp';
      const newContent = words.length > 0 ? words.join('\n') + '\n' : '';
      await fsp.writeFile(tmpPath, newContent, 'utf-8');
      await fsp.rename(tmpPath, approvedFilePath);
    }

    logger.info('DICT', `Word "${word}" (${language}) removed from community-approved dictionary`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('DICT', `Error removing word from approved file: ${err.message}`);
    // Word was still removed from memory
  }

  return true;
}

// Named exports for TypeScript compatibility
export {
  dictionary,
  isDictionaryWord,
  getAvailableDictionaries,
  normalizeHebrewWord,
  normalizeSpanishLetter,
  normalizeSpanishWord,
  normalizeWord,
  addApprovedWord,
  removeApprovedWord,
};

// Additional exported functions
export const load = (): Promise<void> => dictionary.load();
export const loadEnglishOnly = (): Promise<void> => dictionary.loadEnglishOnly();
export const isValidWord = (word: string, language: Language): boolean | null => dictionary.isValidWord(word, language);
export const isValidEnglishWord = (word: string): boolean | null => dictionary.isValidEnglishWord(word);
export const isValidHebrewWord = (word: string): boolean | null => dictionary.isValidHebrewWord(word);
export const isValidSwedishWord = (word: string): boolean | null => dictionary.isValidSwedishWord(word);
export const isValidJapaneseWord = (word: string): boolean | null => dictionary.isValidJapaneseWord(word);
export const isValidSpanishWord = (word: string): boolean | null => dictionary.isValidSpanishWord(word);
export const getRandomKanjiCompounds = (count?: number, minLength?: number, maxLength?: number): string[] => dictionary.getRandomKanjiCompounds(count, minLength, maxLength);
export const getRandomLongWords = (language: Language, count?: number, minLength?: number, maxLength?: number): string[] => dictionary.getRandomLongWords(language, count, minLength, maxLength);
export const getRandomLongWordsWithTheme = (language: Language, count?: number, minLength?: number, maxLength?: number): ThemedWordsResult => dictionary.getRandomLongWordsWithTheme(language, count, minLength, maxLength);
export const ensureLanguageLoaded = (language: Language): Promise<void> => dictionary.ensureLanguageLoaded(language);
// Memory management exports
export const getMemoryStats = (): DictionaryMemoryStats[] => dictionary.getMemoryStats();
export const getTotalMemoryUsage = (): number => dictionary.getTotalMemoryUsage();
export const unloadLanguage = (language: Language): boolean => dictionary.unloadLanguage(language);
export const unloadIdleDictionaries = (maxIdleMs?: number): Language[] => dictionary.unloadIdleDictionaries(maxIdleMs);
export { getCurrentTheme };
export type { DictionaryMemoryStats };

// ES Module exports
