const fs = require('fs');
const path = require('path');

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

    console.log('[Dictionary] Loading dictionaries...');

    try {
      // Load English words
      const englishWords = require('an-array-of-english-words');
      this.englishWords = new Set(englishWords.map(w => w.toLowerCase()));
      console.log(`[Dictionary] Loaded ${this.englishWords.size} English words`);

      // Load Hebrew words
      const hebrewFilePath = path.join(__dirname, 'hebrew_words.txt');
      const hebrewContent = fs.readFileSync(hebrewFilePath, 'utf-8');
      const hebrewWords = hebrewContent
        .split('\n')
        .map(w => w.trim())
        .filter(w => w.length > 0)
        .map(w => normalizeHebrewWord(w));

      this.hebrewWords = new Set(hebrewWords);
      console.log(`[Dictionary] Loaded ${this.hebrewWords.size} Hebrew words`);

      // Load Swedish words
      try {
        // The package has a broken package.json - need to use the compiled output directly
        const swedishWordsPath = path.join(__dirname, '../node_modules/@arvidbt/swedish-words/out/index.js');

        // Read the file and parse it as a CommonJS module would be too complex
        // Instead, read the file content and extract the array
        const swedishFileContent = fs.readFileSync(swedishWordsPath, 'utf-8');

        // The file exports as: export { swedish_words }
        // We need to extract the array from the file
        const arrayMatch = swedishFileContent.match(/var swedish_words = \[([\s\S]*?)\];/);

        if (arrayMatch) {
          // Parse the array content - it's formatted as quoted strings
          const arrayContent = arrayMatch[1];
          const words = arrayContent
            .split(',')
            .map(line => {
              const match = line.trim().match(/^"(.*)"$/);
              return match ? match[1] : null;
            })
            .filter(w => w && w.length > 1); // Filter out single chars and nulls

          this.swedishWords = new Set(words.map(w => w.toLowerCase()));
          console.log(`[Dictionary] Loaded ${this.swedishWords.size} Swedish words`);
        } else {
          console.log('[Dictionary] Could not parse Swedish dictionary - using fallback validation');
        }
      } catch (swedishError) {
        console.error('[Dictionary] Error loading Swedish dictionary:', swedishError.message);
        console.log('[Dictionary] Continuing without Swedish dictionary - words will require manual validation');
      }

      // Load Japanese Kanji compounds
      try {
        const kanjiFilePath = path.join(__dirname, 'kanji_compounds.txt');
        if (fs.existsSync(kanjiFilePath)) {
          const kanjiContent = fs.readFileSync(kanjiFilePath, 'utf-8');
          const kanjiCompounds = kanjiContent
            .split('\n')
            .map(w => w.trim())
            .filter(w => w.length > 0);

          this.japaneseWords = new Set(kanjiCompounds);
          this.kanjiCompounds = kanjiCompounds; // Keep as array for random selection
          console.log(`[Dictionary] Loaded ${this.japaneseWords.size} Japanese Kanji compounds`);
        } else {
          console.log('[Dictionary] Kanji compounds file not found - using fallback validation');
        }
      } catch (japaneseError) {
        console.error('[Dictionary] Error loading Japanese Kanji compounds:', japaneseError);
        console.log('[Dictionary] Continuing without Japanese dictionary - words will require manual validation');
      }

      this.loaded = true;
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

module.exports = {
  dictionary,
  isDictionaryWord,
  getAvailableDictionaries,
  // Also export the dictionary instance as default for backward compatibility
  load: () => dictionary.load(),
  isValidWord: (word, language) => dictionary.isValidWord(word, language),
  isValidEnglishWord: (word) => dictionary.isValidEnglishWord(word),
  isValidHebrewWord: (word) => dictionary.isValidHebrewWord(word),
  isValidSwedishWord: (word) => dictionary.isValidSwedishWord(word),
  isValidJapaneseWord: (word) => dictionary.isValidJapaneseWord(word),
  getRandomKanjiCompounds: (count, minLength, maxLength) => dictionary.getRandomKanjiCompounds(count, minLength, maxLength)
};
