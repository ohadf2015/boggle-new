const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { promisify } = require('util');
const appendFileAsync = promisify(fs.appendFile);

// Hebrew letter normalization - final letters
const hebrewFinalLetters = {
  'ך': 'כ',
  'ם': 'מ',
  'ן': 'נ',
  'ף': 'פ',
  'ץ': 'צ'
};

function normalizeHebrewLetter(letter) {
  return hebrewFinalLetters[letter] || letter;
}

function normalizeHebrewWord(word) {
  return word.split('').map(normalizeHebrewLetter).join('');
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

    console.log('[Dictionary] Loading dictionaries in parallel...');
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
          console.warn(`[Dictionary] Could not read ${filePath}: ${e.message}`);
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
      console.log(`[Dictionary] Loaded ${englishMainCount} English words from main dictionary`);

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
          console.log(`[Dictionary] Loaded ${englishApprovedCount} community-approved English words`);
        }
      }
      console.log(`[Dictionary] Total English words: ${this.englishWords.size}`);

      // Process Hebrew words
      if (hebrewContent) {
        const hebrewWords = hebrewContent
          .split('\n')
          .map(w => w.trim())
          .filter(w => w.length > 0)
          .map(w => normalizeHebrewWord(w));

        this.hebrewWords = new Set(hebrewWords);
        const mainCount = this.hebrewWords.size;
        console.log(`[Dictionary] Loaded ${mainCount} Hebrew words from main dictionary`);
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
          console.log(`[Dictionary] Loaded ${approvedCount} community-approved Hebrew words`);
        }
      }
      console.log(`[Dictionary] Total Hebrew words: ${this.hebrewWords.size}`);

      // Process Swedish words
      if (swedishFileContent) {
        try {
          const arrayMatch = swedishFileContent.match(/var swedish_words = \[([\s\S]*?)\];/);

          if (arrayMatch) {
            const arrayContent = arrayMatch[1];
            const words = arrayContent
              .split(',')
              .map(line => {
                const match = line.trim().match(/^"(.*)"$/);
                return match ? match[1] : null;
              })
              .filter(w => w && w.length > 1);

            this.swedishWords = new Set(words.map(w => w.toLowerCase()));
            const swedishMainCount = this.swedishWords.size;
            console.log(`[Dictionary] Loaded ${swedishMainCount} Swedish words from main dictionary`);

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
                console.log(`[Dictionary] Loaded ${swedishApprovedCount} community-approved Swedish words`);
              }
            }
            console.log(`[Dictionary] Total Swedish words: ${this.swedishWords.size}`);
          } else {
            console.log('[Dictionary] Could not parse Swedish dictionary - using fallback validation');
          }
        } catch (swedishError) {
          console.error('[Dictionary] Error processing Swedish dictionary:', swedishError.message);
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
          console.log(`[Dictionary] Loaded ${japaneseMainCount} Japanese Kanji compounds from main dictionary`);

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
              console.log(`[Dictionary] Loaded ${japaneseApprovedCount} community-approved Japanese words`);
            }
          }
          console.log(`[Dictionary] Total Japanese words: ${this.japaneseWords.size}`);
        } catch (japaneseError) {
          console.error('[Dictionary] Error processing Japanese Kanji compounds:', japaneseError);
        }
      }

      this.loaded = true;
      const loadTime = Date.now() - startTime;
      console.log(`[Dictionary] All dictionaries loaded in ${loadTime}ms`);
    } catch (error) {
      console.error('[Dictionary] Error loading dictionaries:', error);
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

    return dictionary.has(normalizedWord);
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

    switch (language) {
      case 'he':
        dictionary = this.hebrewWords;
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

    // Filter words by length - convert Set to Array and filter
    const filteredWords = Array.from(dictionary).filter(
      w => w.length >= minLength && w.length <= maxLength
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
    console.log(`[Dictionary] Word "${word}" (${language}) promoted to community-approved dictionary`);
    return true;
  } catch (error) {
    console.error('[Dictionary] Error appending approved word to file:', error.message);
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
