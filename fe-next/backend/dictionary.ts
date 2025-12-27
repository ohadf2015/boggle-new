import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import type { Language } from '@/shared/types';

const appendFileAsync = promisify(fs.appendFile);
const logger = require('./utils/logger');
const { getThemedWords, getCurrentTheme } = require('./data/dateThemedWords');

// Hebrew letter normalization - final letters
const hebrewFinalLetters: Record<string, string> = {
  'ך': 'כ',
  'ם': 'מ',
  'ן': 'נ',
  'ף': 'פ',
  'ץ': 'צ'
};

// Valid Hebrew letters (aleph to tav, including final forms)
const validHebrewLetters = new Set<string>([
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'כ', 'ך', 'ל', 'מ', 'ם', 'נ', 'ן', 'ס', 'ע', 'פ',
  'ף', 'צ', 'ץ', 'ק', 'ר', 'ש', 'ת'
]);

function normalizeHebrewLetter(letter: string): string {
  return hebrewFinalLetters[letter] || letter;
}

function normalizeHebrewWord(word: string): string {
  return word.split('').map(normalizeHebrewLetter).join('');
}

// Check if a word contains only valid Hebrew letters (no punctuation like gershayim ״ or geresh ׳)
function isValidHebrewWordForBoard(word: string): boolean {
  return word.split('').every(char => validHebrewLetters.has(char));
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

class Dictionary {
  englishWords: Set<string>;
  hebrewWords: Set<string>;
  swedishWords: Set<string>;
  japaneseWords: Set<string>;
  spanishWords: Set<string>;
  kanjiCompounds: string[];
  loaded: boolean;

  constructor() {
    this.englishWords = new Set();
    this.hebrewWords = new Set();
    this.swedishWords = new Set();
    this.japaneseWords = new Set();
    this.spanishWords = new Set();
    this.kanjiCompounds = []; // Array of valid Kanji compounds for board generation
    this.loaded = false;
  }

  async load(): Promise<void> {
    if (this.loaded) {
      return;
    }

    logger.info('DICT', 'Loading dictionaries in parallel...');
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
      const loadTime = Date.now() - startTime;
      logger.info('DICT', `All dictionaries loaded in ${loadTime}ms`);
    } catch (error) {
      logger.error('DICT', `Error loading dictionaries: ${error}`);
      // Continue without dictionaries - fall back to manual validation
    }
  }

  isValidWord(word: string, language: Language): boolean | null {
    if (!this.loaded) {
      // If dictionaries aren't loaded, treat all words as unknown (require manual validation)
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
};

// Additional exported functions
export const load = (): Promise<void> => dictionary.load();
export const isValidWord = (word: string, language: Language): boolean | null => dictionary.isValidWord(word, language);
export const isValidEnglishWord = (word: string): boolean | null => dictionary.isValidEnglishWord(word);
export const isValidHebrewWord = (word: string): boolean | null => dictionary.isValidHebrewWord(word);
export const isValidSwedishWord = (word: string): boolean | null => dictionary.isValidSwedishWord(word);
export const isValidJapaneseWord = (word: string): boolean | null => dictionary.isValidJapaneseWord(word);
export const isValidSpanishWord = (word: string): boolean | null => dictionary.isValidSpanishWord(word);
export const getRandomKanjiCompounds = (count?: number, minLength?: number, maxLength?: number): string[] => dictionary.getRandomKanjiCompounds(count, minLength, maxLength);
export const getRandomLongWords = (language: Language, count?: number, minLength?: number, maxLength?: number): string[] => dictionary.getRandomLongWords(language, count, minLength, maxLength);
export const getRandomLongWordsWithTheme = (language: Language, count?: number, minLength?: number, maxLength?: number): ThemedWordsResult => dictionary.getRandomLongWordsWithTheme(language, count, minLength, maxLength);
export { getCurrentTheme };

// CommonJS exports for backward compatibility
module.exports = {
  dictionary,
  isDictionaryWord,
  getAvailableDictionaries,
  normalizeHebrewWord,
  normalizeSpanishLetter,
  normalizeSpanishWord,
  normalizeWord,
  addApprovedWord,
  load,
  isValidWord,
  isValidEnglishWord,
  isValidHebrewWord,
  isValidSwedishWord,
  isValidJapaneseWord,
  isValidSpanishWord,
  getRandomKanjiCompounds,
  getRandomLongWords,
  getRandomLongWordsWithTheme,
  getCurrentTheme,
};
