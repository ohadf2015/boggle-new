const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { promisify } = require('util');
const appendFileAsync = promisify(fs.appendFile);
const logger = require('./utils/logger');

// Hebrew letter normalization - final letters
const hebrewFinalLetters = {
  'ך': 'כ',
  'ם': 'מ',
  'ן': 'נ',
  'ף': 'פ',
  'ץ': 'צ'
};

// Valid Hebrew letters (aleph to tav, including final forms)
const validHebrewLetters = new Set([
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'כ', 'ך', 'ל', 'מ', 'ם', 'נ', 'ן', 'ס', 'ע', 'פ',
  'ף', 'צ', 'ץ', 'ק', 'ר', 'ש', 'ת'
]);

function normalizeHebrewLetter(letter) {
  return hebrewFinalLetters[letter] || letter;
}

function normalizeHebrewWord(word) {
  return word.split('').map(normalizeHebrewLetter).join('');
}

// Check if a word contains only valid Hebrew letters (no punctuation like gershayim ״ or geresh ׳)
function isValidHebrewWordForBoard(word) {
  return word.split('').every(char => validHebrewLetters.has(char));
}

class Dictionary {
  constructor() {
    this.englishWords = new Set();
    this.hebrewWords = new Set();
    this.swedishWords = new Set();
    this.japaneseWords = new Set();
    this.kanjiCompounds = []; // Array of valid Kanji compounds for board generation
    this.loaded = false;
  }

  async load() {
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

      // Helper to safely read a file (returns empty string if not exists)
      const safeReadFile = async (filePath) => {
        try {
          if (fs.existsSync(filePath)) {
            return await fsp.readFile(filePath, 'utf-8');
          }
        } catch (e) {
          logger.warn('DICT', `Could not read ${filePath}: ${e.message}`);
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
      ] = await Promise.all([
        safeReadFile(hebrewFilePath),
        safeReadFile(hebrewApprovedFilePath),
        safeReadFile(englishApprovedFilePath),
        safeReadFile(swedishWordsPath),
        safeReadFile(swedishApprovedFilePath),
        safeReadFile(kanjiFilePath),
        safeReadFile(japaneseApprovedFilePath),
      ]);

      // Process English words (synchronous require, but fast)
      const englishWords = require('an-array-of-english-words');
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
            const decodeJsEscapes = (str) => {
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
              .filter(w => w && w.length > 1 && validSwedishWordPattern.test(w));

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
        } catch (swedishError) {
          logger.error('DICT', `Error processing Swedish dictionary: ${swedishError.message}`);
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

      this.loaded = true;
      const loadTime = Date.now() - startTime;
      logger.info('DICT', `All dictionaries loaded in ${loadTime}ms`);
    } catch (error) {
      logger.error('DICT', `Error loading dictionaries: ${error}`);
      // Continue without dictionaries - fall back to manual validation
    }
  }

  isValidWord(word, language) {
    if (!this.loaded) {
      // If dictionaries aren't loaded, treat all words as unknown (require manual validation)
      return null;
    }

    let normalizedWord;
    let dictionary;

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

  isValidEnglishWord(word) {
    return this.isValidWord(word, 'en');
  }

  isValidHebrewWord(word) {
    return this.isValidWord(word, 'he');
  }

  isValidSwedishWord(word) {
    return this.isValidWord(word, 'sv');
  }

  isValidJapaneseWord(word) {
    return this.isValidWord(word, 'ja');
  }

  // Get random Kanji compounds for board generation
  getRandomKanjiCompounds(count = 5, minLength = 2, maxLength = 4) {
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
  getRandomLongWords(language, count = 5, minLength = 4, maxLength = 8) {
    let dictionary;
    let normalizer = (w) => w;
    let validator = () => true; // Default: accept all words

    switch (language) {
      case 'he':
        dictionary = this.hebrewWords;
        // Filter out words with non-Hebrew characters (like gershayim ״ or geresh ׳)
        validator = isValidHebrewWordForBoard;
        break;
      case 'sv':
        dictionary = this.swedishWords;
        normalizer = (w) => w.toUpperCase(); // Swedish board uses uppercase
        break;
      case 'en':
        dictionary = this.englishWords;
        normalizer = (w) => w.toUpperCase(); // English board uses uppercase
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
}

// Create a singleton instance
const dictionary = new Dictionary();

// Export wrapper functions for compatibility
function isDictionaryWord(word, language) {
  return dictionary.isValidWord(word, language);
}

function getAvailableDictionaries() {
  return ['en', 'he', 'sv', 'ja'];
}

// Normalize word based on language
function normalizeWord(word, language) {
  switch (language) {
    case 'he':
      return normalizeHebrewWord(word);
    case 'ja':
      return word; // Japanese doesn't need normalization
    case 'en':
    case 'sv':
    default:
      return word.toLowerCase();
  }
}

// Get the dictionary Set and approved file path for a language
function getLanguageConfig(language) {
  const configs = {
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
    }
  };
  return configs[language] || configs.en;
}

// Add a community-approved word to the dictionary (both in-memory and file)
async function addApprovedWord(word, language) {
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
  } catch (error) {
    logger.error('DICT', `Error appending approved word to file: ${error.message}`);
    // Word is still in memory, just not persisted
    return true;
  }
}

module.exports = {
  dictionary,
  isDictionaryWord,
  getAvailableDictionaries,
  normalizeHebrewWord,
  normalizeWord,
  addApprovedWord,
  // Also export the dictionary instance as default for backward compatibility
  load: () => dictionary.load(),
  isValidWord: (word, language) => dictionary.isValidWord(word, language),
  isValidEnglishWord: (word) => dictionary.isValidEnglishWord(word),
  isValidHebrewWord: (word) => dictionary.isValidHebrewWord(word),
  isValidSwedishWord: (word) => dictionary.isValidSwedishWord(word),
  isValidJapaneseWord: (word) => dictionary.isValidJapaneseWord(word),
  getRandomKanjiCompounds: (count, minLength, maxLength) => dictionary.getRandomKanjiCompounds(count, minLength, maxLength),
  getRandomLongWords: (language, count, minLength, maxLength) => dictionary.getRandomLongWords(language, count, minLength, maxLength)
};
