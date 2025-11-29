// Offline dictionary service with downloadable language packs
import { Paths, File, Directory } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupportedLanguage } from '../../constants/game';
import { normalizeHebrewWord } from '../../lib/gameLogic/wordValidator';

const DICTIONARY_META_KEY = 'lexiclash_dictionary_meta';

// Dictionary download URLs (would be hosted on your CDN)
const DICTIONARY_URLS: Record<SupportedLanguage, string> = {
  en: 'https://lexiclash.com/dictionaries/en.json.gz',
  he: 'https://lexiclash.com/dictionaries/he.json.gz',
  sv: 'https://lexiclash.com/dictionaries/sv.json.gz',
  ja: 'https://lexiclash.com/dictionaries/ja.json.gz',
};

// Approximate dictionary sizes (for UI display)
const DICTIONARY_SIZES: Record<SupportedLanguage, string> = {
  en: '2.5 MB',
  he: '1.8 MB',
  sv: '1.2 MB',
  ja: '2.1 MB',
};

interface DictionaryMeta {
  version: string;
  downloadedAt: string;
  wordCount: number;
}

interface DictionaryStatus {
  language: SupportedLanguage;
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  size: string;
  meta?: DictionaryMeta;
}

class DictionaryServiceClass {
  private loadedDictionaries: Map<SupportedLanguage, Set<string>> = new Map();
  private downloadingLanguages: Set<SupportedLanguage> = new Set();
  private downloadProgress: Map<SupportedLanguage, number> = new Map();
  private dictionaryDir: Directory | null = null;

  async initialize(): Promise<void> {
    // Create dictionary directory in document storage
    this.dictionaryDir = new Directory(Paths.document, 'dictionaries');
    if (!this.dictionaryDir.exists) {
      this.dictionaryDir.create();
    }
  }

  private getDictionaryFile(language: SupportedLanguage): File {
    if (!this.dictionaryDir) {
      this.dictionaryDir = new Directory(Paths.document, 'dictionaries');
    }
    return new File(this.dictionaryDir, `${language}.json`);
  }

  // Get status of all dictionaries
  async getAllDictionaryStatus(): Promise<DictionaryStatus[]> {
    const languages: SupportedLanguage[] = ['en', 'he', 'sv', 'ja'];
    const statuses: DictionaryStatus[] = [];

    for (const lang of languages) {
      statuses.push(await this.getDictionaryStatus(lang));
    }

    return statuses;
  }

  // Get status of a specific dictionary
  async getDictionaryStatus(language: SupportedLanguage): Promise<DictionaryStatus> {
    const file = this.getDictionaryFile(language);
    const meta = await this.getDictionaryMeta(language);

    return {
      language,
      isDownloaded: file.exists,
      isDownloading: this.downloadingLanguages.has(language),
      downloadProgress: this.downloadProgress.get(language) || 0,
      size: DICTIONARY_SIZES[language],
      meta: meta || undefined,
    };
  }

  // Download a dictionary
  async downloadDictionary(
    language: SupportedLanguage,
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    if (this.downloadingLanguages.has(language)) {
      console.log(`[Dictionary] Already downloading ${language}`);
      return false;
    }

    this.downloadingLanguages.add(language);
    this.downloadProgress.set(language, 0);

    try {
      const url = DICTIONARY_URLS[language];
      const file = this.getDictionaryFile(language);

      console.log(`[Dictionary] Downloading ${language} from ${url}`);

      // Download file using fetch and write to file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      file.write(text);

      // Save metadata
      const meta: DictionaryMeta = {
        version: '1.0',
        downloadedAt: new Date().toISOString(),
        wordCount: 0, // Will be updated when loaded
      };
      await this.saveDictionaryMeta(language, meta);

      this.downloadProgress.set(language, 1);
      onProgress?.(1);

      console.log(`[Dictionary] Downloaded ${language} successfully`);
      return true;
    } catch (error) {
      console.error(`[Dictionary] Failed to download ${language}:`, error);
      return false;
    } finally {
      this.downloadingLanguages.delete(language);
      this.downloadProgress.delete(language);
    }
  }

  // Delete a downloaded dictionary
  async deleteDictionary(language: SupportedLanguage): Promise<boolean> {
    try {
      const file = this.getDictionaryFile(language);
      if (file.exists) {
        file.delete();
      }
      await this.deleteDictionaryMeta(language);
      this.loadedDictionaries.delete(language);
      console.log(`[Dictionary] Deleted ${language}`);
      return true;
    } catch (error) {
      console.error(`[Dictionary] Failed to delete ${language}:`, error);
      return false;
    }
  }

  // Load dictionary into memory
  async loadDictionary(language: SupportedLanguage): Promise<boolean> {
    if (this.loadedDictionaries.has(language)) {
      return true;
    }

    try {
      const file = this.getDictionaryFile(language);

      if (!file.exists) {
        console.log(`[Dictionary] ${language} not downloaded`);
        return false;
      }

      const content = await file.text();
      const words: string[] = JSON.parse(content);

      // Create Set for O(1) lookup
      const wordSet = new Set(words.map((w) => w.toLowerCase()));
      this.loadedDictionaries.set(language, wordSet);

      // Update word count in meta
      const meta = await this.getDictionaryMeta(language);
      if (meta) {
        meta.wordCount = wordSet.size;
        await this.saveDictionaryMeta(language, meta);
      }

      console.log(`[Dictionary] Loaded ${language} with ${wordSet.size} words`);
      return true;
    } catch (error) {
      console.error(`[Dictionary] Failed to load ${language}:`, error);
      return false;
    }
  }

  // Unload dictionary from memory
  unloadDictionary(language: SupportedLanguage): void {
    this.loadedDictionaries.delete(language);
  }

  // Check if a word is valid (offline)
  isValidWord(word: string, language: SupportedLanguage): boolean {
    const dictionary = this.loadedDictionaries.get(language);
    if (!dictionary) {
      console.warn(`[Dictionary] ${language} not loaded`);
      return false;
    }

    // Normalize word (especially for Hebrew)
    let normalizedWord = word.toLowerCase().trim();
    if (language === 'he') {
      normalizedWord = normalizeHebrewWord(normalizedWord);
    }

    return dictionary.has(normalizedWord);
  }

  // Check if dictionary is loaded
  isDictionaryLoaded(language: SupportedLanguage): boolean {
    return this.loadedDictionaries.has(language);
  }

  // Check if dictionary is downloaded
  async isDictionaryDownloaded(language: SupportedLanguage): Promise<boolean> {
    const file = this.getDictionaryFile(language);
    return file.exists;
  }

  // Private: Save dictionary metadata
  private async saveDictionaryMeta(language: SupportedLanguage, meta: DictionaryMeta): Promise<void> {
    try {
      const allMeta = await this.getAllDictionaryMeta();
      allMeta[language] = meta;
      await AsyncStorage.setItem(DICTIONARY_META_KEY, JSON.stringify(allMeta));
    } catch (error) {
      console.error('[Dictionary] Failed to save meta:', error);
    }
  }

  // Private: Get dictionary metadata
  private async getDictionaryMeta(language: SupportedLanguage): Promise<DictionaryMeta | null> {
    try {
      const allMeta = await this.getAllDictionaryMeta();
      return allMeta[language] || null;
    } catch (error) {
      console.error('[Dictionary] Failed to get meta:', error);
      return null;
    }
  }

  // Private: Delete dictionary metadata
  private async deleteDictionaryMeta(language: SupportedLanguage): Promise<void> {
    try {
      const allMeta = await this.getAllDictionaryMeta();
      delete allMeta[language];
      await AsyncStorage.setItem(DICTIONARY_META_KEY, JSON.stringify(allMeta));
    } catch (error) {
      console.error('[Dictionary] Failed to delete meta:', error);
    }
  }

  // Private: Get all dictionary metadata
  private async getAllDictionaryMeta(): Promise<Record<string, DictionaryMeta>> {
    try {
      const stored = await AsyncStorage.getItem(DICTIONARY_META_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }
}

export const DictionaryService = new DictionaryServiceClass();
