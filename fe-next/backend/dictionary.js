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
      const { swedish_words } = require('@arvidbt/swedish-words/out/index.js');
      this.swedishWords = new Set(swedish_words.map(w => w.toLowerCase()));
      console.log(`[Dictionary] Loaded ${this.swedishWords.size} Swedish words`);

      // Load Japanese words
      try {
        const japaneseFilePath = path.join(__dirname, 'japanese_words.txt');
        if (fs.existsSync(japaneseFilePath)) {
          const japaneseContent = fs.readFileSync(japaneseFilePath, 'utf-8');
          const japaneseWords = japaneseContent
            .split('\n')
            .map(w => w.trim())
            .filter(w => w.length > 0);

          this.japaneseWords = new Set(japaneseWords);
          console.log(`[Dictionary] Loaded ${this.japaneseWords.size} Japanese words`);
        } else {
          console.log('[Dictionary] Japanese dictionary file not found - using fallback validation');
        }
      } catch (japaneseError) {
        console.error('[Dictionary] Error loading Japanese dictionary:', japaneseError);
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
}

// Create a singleton instance
const dictionary = new Dictionary();

module.exports = dictionary;
