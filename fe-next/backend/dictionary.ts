import type { Language } from '@/shared/types';
import logger from './utils/logger';
import { getThemedWords, getCurrentTheme } from './data/dateThemedWords';
import {
  normalizeHebrewWord,
  isValidHebrewLetter,
  normalizeRussianWord,
} from '@/shared/utils/wordNormalization';
import {
  createSafeReadFile,
  loadEnglishDictionary,
  loadHebrewDictionary,
  loadSwedishDictionary,
  loadJapaneseDictionary,
  loadSpanishDictionary,
  loadRussianDictionary,
  loadNounList,
} from './dictionaryLoaders';

function isValidHebrewWordForBoard(word: string): boolean {
  return word.split('').every(char => isValidHebrewLetter(char));
}

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

interface DictionaryMemoryStats {
  language: Language;
  wordCount: number;
  estimatedBytes: number;
  lastAccessed: number;
}

/** Throttle for retrying a dictionary that loaded empty (see ensureLanguageLoaded). */
const EMPTY_LOAD_RETRY_MS = 60_000;

class Dictionary {
  static _communityValidator: ((word: string, language: Language) => boolean) | null = null;

  englishWords: Set<string>;
  hebrewWords: Set<string>;
  swedishWords: Set<string>;
  japaneseWords: Set<string>;
  spanishWords: Set<string>;
  russianWords: Set<string>;
  kanjiCompounds: string[];
  // Noun-only subsets for board seeding (players see recognizable words)
  nounLists: Map<Language, Set<string>>;
  loaded: boolean;
  loadedLanguages: Set<Language>;
  loadingPromises: Map<Language, Promise<void>>;
  /** When a language last loaded EMPTY, so retries are throttled. */
  emptyLoadAt: Map<Language, number>;
  lastAccessTime: Map<Language, number>;

  constructor() {
    this.englishWords = new Set();
    this.hebrewWords = new Set();
    this.swedishWords = new Set();
    this.japaneseWords = new Set();
    this.spanishWords = new Set();
    this.russianWords = new Set();
    this.kanjiCompounds = [];
    this.nounLists = new Map();
    this.loaded = false;
    this.loadedLanguages = new Set();
    this.loadingPromises = new Map();
    this.emptyLoadAt = new Map();
    this.lastAccessTime = new Map();
  }

  private getDictionaryForLanguage(lang: Language): Set<string> {
    const map: Record<string, Set<string>> = {
      en: this.englishWords, he: this.hebrewWords, sv: this.swedishWords,
      ja: this.japaneseWords, es: this.spanishWords, ru: this.russianWords,
    };
    return map[lang] || this.englishWords;
  }

  getMemoryStats(): DictionaryMemoryStats[] {
    const avgBytesPerWord = 12;
    const stats: DictionaryMemoryStats[] = [];
    const languages: Language[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
    for (const lang of languages) {
      if (this.loadedLanguages.has(lang)) {
        const dict = this.getDictionaryForLanguage(lang);
        stats.push({
          language: lang,
          wordCount: dict.size,
          estimatedBytes: dict.size * avgBytesPerWord,
          lastAccessed: this.lastAccessTime.get(lang) || 0
        });
      }
    }
    return stats;
  }

  getTotalMemoryUsage(): number {
    return this.getMemoryStats().reduce((sum, stat) => sum + stat.estimatedBytes, 0);
  }

  unloadLanguage(language: Language): boolean {
    if (language === 'en') {
      logger.warn('DICT', 'Cannot unload English dictionary - it is the default fallback');
      return false;
    }
    if (!this.loadedLanguages.has(language)) return false;

    const beforeSize = this.getTotalMemoryUsage();

    switch (language) {
      case 'he': this.hebrewWords = new Set(); break;
      case 'sv': this.swedishWords = new Set(); break;
      case 'ja': this.japaneseWords = new Set(); this.kanjiCompounds = []; break;
      case 'es': this.spanishWords = new Set(); break;
      case 'ru': this.russianWords = new Set(); break;
    }

    this.nounLists.delete(language);
    this.loadedLanguages.delete(language);
    this.lastAccessTime.delete(language);

    const freedBytes = beforeSize - this.getTotalMemoryUsage();
    logger.info('DICT', `Unloaded ${language} dictionary, freed ~${Math.round(freedBytes / 1024)}KB`);
    return true;
  }

  unloadIdleDictionaries(maxIdleMs: number = 30 * 60 * 1000): Language[] {
    const now = Date.now();
    const unloaded: Language[] = [];

    for (const [language, lastAccess] of this.lastAccessTime.entries()) {
      if (language !== 'en' && now - lastAccess > maxIdleMs) {
        if (this.unloadLanguage(language)) unloaded.push(language);
      }
    }

    if (unloaded.length > 0) {
      logger.info('DICT', `Unloaded ${unloaded.length} idle dictionaries: ${unloaded.join(', ')}`);
    }
    return unloaded;
  }

  async loadEnglishOnly(): Promise<void> {
    if (this.loadedLanguages.has('en')) return;

    logger.info('DICT', 'Loading English dictionary only (lazy loading enabled for other languages)...');
    const startTime = Date.now();

    try {
      await this.loadLanguage('en');
      this.loadedLanguages.add('en');
      this.lastAccessTime.set('en', Date.now());
      this.loaded = true;

      // Lazily initialize community word validator (once, not per-call)
      if (!Dictionary._communityValidator) {
        try {
          const { isWordCommunityValid } = await import('./modules/communityWordManager');
          Dictionary._communityValidator = isWordCommunityValid;
        } catch {
          // Community word manager not available yet
        }
      }

      const loadTime = Date.now() - startTime;
      logger.info('DICT', `English dictionary loaded in ${loadTime}ms (other languages will be lazy-loaded)`);
    } catch (error) {
      logger.error('DICT', `Error loading English dictionary: ${error}`);
    }
  }

  async load(): Promise<void> {
    if (this.loaded) return;

    logger.info('DICT', 'Loading all dictionaries in parallel...');
    const startTime = Date.now();

    try {
      const languages: Language[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
      await Promise.all(languages.map(lang => this.loadLanguage(lang)));

      this.loaded = true;
      for (const lang of languages) {
        this.loadedLanguages.add(lang);
      }
      const loadTime = Date.now() - startTime;
      logger.info('DICT', `All dictionaries loaded in ${loadTime}ms`);
    } catch (error) {
      logger.error('DICT', `Error loading dictionaries: ${error}`);
    }
  }

  async ensureLanguageLoaded(language: Language): Promise<void> {
    if (this.loadedLanguages.has(language)) {
      this.lastAccessTime.set(language, Date.now());
      return;
    }
    if (this.loadingPromises.has(language)) {
      return this.loadingPromises.get(language);
    }
    const failedAt = this.emptyLoadAt.get(language);
    if (failedAt !== undefined && Date.now() - failedAt < EMPTY_LOAD_RETRY_MS) return;

    const loadPromise = this.loadLanguage(language);
    this.loadingPromises.set(language, loadPromise);

    try {
      await loadPromise;
      // loadLanguage() swallows its own errors, so an empty Set is the only
      // signal that the load failed. Marking it "loaded" anyway pinned the
      // failure for the life of the process — every later call short-circuited
      // above and the solver reported "No dictionary available" forever.
      // Leave it unmarked so the next call retries — but not on every call:
      // a genuinely broken dictionary would otherwise re-read a 30 MB word file
      // on every bot word-prep. One retry per minute is enough to self-heal.
      if (this.getDictionaryForLanguage(language).size === 0) {
        logger.error('DICT', `${language} dictionary loaded empty - will retry in ${EMPTY_LOAD_RETRY_MS / 1000}s`);
        this.emptyLoadAt.set(language, Date.now());
        return;
      }
      this.emptyLoadAt.delete(language);
      this.loadedLanguages.add(language);
      this.lastAccessTime.set(language, Date.now());
    } finally {
      this.loadingPromises.delete(language);
    }
  }

  private async loadLanguage(language: Language): Promise<void> {
    const startTime = Date.now();
    logger.info('DICT', `Lazy loading ${language} dictionary...`);

    try {
      const safeReadFile = createSafeReadFile();

      switch (language) {
        case 'en':
          this.englishWords = await loadEnglishDictionary(safeReadFile);
          break;
        case 'he':
          this.hebrewWords = await loadHebrewDictionary(safeReadFile);
          break;
        case 'sv':
          this.swedishWords = await loadSwedishDictionary(safeReadFile);
          break;
        case 'ja': {
          const result = await loadJapaneseDictionary(safeReadFile);
          this.japaneseWords = result.words;
          this.kanjiCompounds = result.compounds;
          break;
        }
        case 'es':
          this.spanishWords = await loadSpanishDictionary(safeReadFile);
          break;
        case 'ru':
          this.russianWords = await loadRussianDictionary(safeReadFile);
          break;
      }

      // Load noun list for board seeding (non-blocking — empty set is fine as fallback)
      const nounNormalizer = language === 'he'
        ? (w: string) => normalizeHebrewWord(w.trim())
        : (w: string) => w.trim().toLowerCase();
      const nouns = await loadNounList(safeReadFile, language, nounNormalizer);
      if (nouns.size > 0) {
        this.nounLists.set(language, nouns);
      }

      const loadTime = Date.now() - startTime;
      const nounInfo = nouns.size > 0 ? ` (${nouns.size} nouns)` : '';
      logger.info('DICT', `${language} dictionary loaded in ${loadTime}ms${nounInfo}`);
    } catch (error) {
      logger.error('DICT', `Error loading ${language} dictionary: ${error}`);
    }
  }

  isValidWord(word: string, language: Language): boolean | null {
    if (!this.loadedLanguages.has(language)) return null;
    this.lastAccessTime.set(language, Date.now());
    if (!this.loaded && this.loadedLanguages.size === 0) return null;

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
        normalizedWord = word;
        dictionary = this.japaneseWords;
        break;
      case 'es':
        normalizedWord = normalizeSpanishWord(word);
        dictionary = this.spanishWords;
        break;
      case 'ru':
        normalizedWord = normalizeRussianWord(word);
        dictionary = this.russianWords;
        break;
      case 'en':
      default:
        normalizedWord = word.toLowerCase();
        dictionary = this.englishWords;
        break;
    }

    if (dictionary.has(normalizedWord)) return true;

    try {
      if (Dictionary._communityValidator) {
        if (Dictionary._communityValidator(normalizedWord, language)) return true;
      }
    } catch {
      // Community word manager not available yet
    }

    return false;
  }

  isValidEnglishWord(word: string): boolean | null { return this.isValidWord(word, 'en'); }
  isValidHebrewWord(word: string): boolean | null { return this.isValidWord(word, 'he'); }
  isValidSwedishWord(word: string): boolean | null { return this.isValidWord(word, 'sv'); }
  isValidJapaneseWord(word: string): boolean | null { return this.isValidWord(word, 'ja'); }
  isValidSpanishWord(word: string): boolean | null { return this.isValidWord(word, 'es'); }
  isValidRussianWord(word: string): boolean | null { return this.isValidWord(word, 'ru'); }

  getRandomKanjiCompounds(count: number = 5, minLength: number = 2, maxLength: number = 4): string[] {
    if (!this.kanjiCompounds || this.kanjiCompounds.length === 0) return [];
    const filtered = this.kanjiCompounds.filter(w => w.length >= minLength && w.length <= maxLength);
    if (filtered.length === 0) return [];
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  getRandomLongWords(language: Language, count: number = 5, minLength: number = 4, maxLength: number = 8): string[] {
    let dictionary: Set<string>;
    let normalizer = (w: string): string => w;
    let validator = (_w: string): boolean => true;

    switch (language) {
      case 'he':
        dictionary = this.hebrewWords;
        validator = isValidHebrewWordForBoard;
        break;
      case 'sv':
        dictionary = this.swedishWords;
        normalizer = (w: string): string => w.toUpperCase();
        break;
      case 'en':
        dictionary = this.englishWords;
        normalizer = (w: string): string => w.toUpperCase();
        break;
      case 'es':
        dictionary = this.spanishWords;
        normalizer = (w: string): string => w.toUpperCase();
        break;
      case 'ru':
        dictionary = this.russianWords;
        normalizer = (w: string): string => w.toUpperCase();
        break;
      case 'ja':
        return this.getRandomKanjiCompounds(count, minLength, maxLength);
      default:
        return [];
    }

    if (!dictionary || dictionary.size === 0) return [];

    // Prefer nouns for board seeding — players see recognizable words
    const nounList = this.nounLists.get(language);
    const sourceWords = nounList && nounList.size > 0 ? nounList : dictionary;

    const filtered = Array.from(sourceWords).filter(
      w => w.length >= minLength && w.length <= maxLength && validator(w)
    );
    if (filtered.length === 0) return [];

    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length)).map(normalizer);
  }

  getRandomLongWordsWithTheme(
    language: Language, count: number = 10, minLength: number = 3, maxLength: number = 12
  ): ThemedWordsResult {
    const themedCount = Math.ceil(count / 2);
    const regularCount = count - themedCount;

    const themedResult = getThemedWords(language, themedCount, minLength, maxLength) as ThemedWordsResult;
    let themedWords = themedResult.words;

    let normalizer = (w: string): string => w;
    if (language === 'en' || language === 'sv' || language === 'es') {
      normalizer = (w: string): string => w.toUpperCase();
    }
    themedWords = themedWords.map(normalizer);

    const regularWords = this.getRandomLongWords(language, regularCount, minLength, maxLength);
    const allWords = [...themedWords, ...regularWords];
    const shuffled = allWords.sort(() => Math.random() - 0.5);
    const uniqueWords = [...new Set(shuffled)];

    return { words: uniqueWords, theme: themedResult.theme };
  }
}

// Singleton
const dictionary = new Dictionary();

function isDictionaryWord(word: string, language: Language): boolean | null {
  return dictionary.isValidWord(word, language);
}

function getAvailableDictionaries(): Language[] {
  return ['en', 'he', 'sv', 'ja', 'es', 'ru'];
}

function normalizeWord(word: string, language: Language): string {
  switch (language) {
    case 'he': return normalizeHebrewWord(word);
    case 'es': return normalizeSpanishWord(word);
    case 'ru': return normalizeRussianWord(word);
    case 'ja': return word;
    case 'en':
    case 'sv':
    default: return word.toLowerCase();
  }
}

function getLanguageConfig(language: Language): LanguageConfig {
  const configs: Record<string, LanguageConfig> = {
    en: { dictionary: dictionary.englishWords, approvedFile: 'english_words_approved.txt' },
    he: { dictionary: dictionary.hebrewWords, approvedFile: 'hebrew_words_approved.txt' },
    sv: { dictionary: dictionary.swedishWords, approvedFile: 'swedish_words_approved.txt' },
    ja: { dictionary: dictionary.japaneseWords, approvedFile: 'japanese_words_approved.txt' },
    es: { dictionary: dictionary.spanishWords, approvedFile: 'spanish_words_approved.txt' },
    ru: { dictionary: dictionary.russianWords, approvedFile: 'russian_words_approved.txt' },
  };
  return configs[language] || configs.en;
}

// Audit C3 (2026-05-01): runtime persistence is DB-only. We previously appended
// to `*_approved.txt` here, but Railway containers have ephemeral FS — those
// writes were lost on every redeploy. Real persistence happens via
// `word_scores.is_potentially_valid=true`, rehydrated by `loadCommunityWords()`
// at boot. The committed `*_approved.txt` files still seed the baseline at boot.
async function addApprovedWord(word: string, language: Language): Promise<boolean> {
  const config = getLanguageConfig(language);
  const normalizedWord = normalizeWord(word, language);
  if (config.dictionary.has(normalizedWord)) return false;
  config.dictionary.add(normalizedWord);
  logger.info('DICT', `Word "${word}" (${language}) added to in-memory dictionary; DB is the authoritative store`);
  return true;
}

async function removeApprovedWord(word: string, language: Language): Promise<boolean> {
  const config = getLanguageConfig(language);
  const normalizedWord = normalizeWord(word, language);
  if (!config.dictionary.has(normalizedWord)) return false;
  config.dictionary.delete(normalizedWord);
  logger.info('DICT', `Word "${word}" (${language}) removed from in-memory dictionary; DB is the authoritative store`);
  return true;
}

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

export const load = (): Promise<void> => dictionary.load();
export const loadEnglishOnly = (): Promise<void> => dictionary.loadEnglishOnly();
export const isValidWord = (word: string, language: Language): boolean | null => dictionary.isValidWord(word, language);
/**
 * Async word validation with Redis cache layer.
 * Checks cache first, falls back to in-memory dictionary, then populates cache.
 * Use this in async paths (socket handlers, API routes) where the cache hit
 * avoids needing the dictionary loaded in memory for that language.
 */
export const isValidWordCached = async (word: string, language: Language): Promise<boolean | null> => {
  const { getCachedWordValidation, setCachedWordValidation } = await import('./cache/wordCache');
  const cached = await getCachedWordValidation(language, word);
  if (cached !== null) return cached;

  const result = dictionary.isValidWord(word, language);
  if (result !== null) {
    // fire-and-forget cache population
    setCachedWordValidation(language, word, result).catch(() => {});
  }
  return result;
};
export const isValidEnglishWord = (word: string): boolean | null => dictionary.isValidEnglishWord(word);
export const isValidHebrewWord = (word: string): boolean | null => dictionary.isValidHebrewWord(word);
export const isValidSwedishWord = (word: string): boolean | null => dictionary.isValidSwedishWord(word);
export const isValidJapaneseWord = (word: string): boolean | null => dictionary.isValidJapaneseWord(word);
export const isValidSpanishWord = (word: string): boolean | null => dictionary.isValidSpanishWord(word);
export const getRandomKanjiCompounds = (count?: number, minLength?: number, maxLength?: number): string[] => dictionary.getRandomKanjiCompounds(count, minLength, maxLength);
export const getRandomLongWords = (language: Language, count?: number, minLength?: number, maxLength?: number): string[] => dictionary.getRandomLongWords(language, count, minLength, maxLength);
export const getRandomLongWordsWithTheme = (language: Language, count?: number, minLength?: number, maxLength?: number): ThemedWordsResult => dictionary.getRandomLongWordsWithTheme(language, count, minLength, maxLength);
export const ensureLanguageLoaded = (language: Language): Promise<void> => dictionary.ensureLanguageLoaded(language);
export const getMemoryStats = (): DictionaryMemoryStats[] => dictionary.getMemoryStats();
export const getTotalMemoryUsage = (): number => dictionary.getTotalMemoryUsage();
export const unloadLanguage = (language: Language): boolean => dictionary.unloadLanguage(language);
export const unloadIdleDictionaries = (maxIdleMs?: number): Language[] => dictionary.unloadIdleDictionaries(maxIdleMs);
export { getCurrentTheme };
export type { DictionaryMemoryStats };
