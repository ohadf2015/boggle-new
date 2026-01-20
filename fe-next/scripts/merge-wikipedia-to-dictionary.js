#!/usr/bin/env node
/**
 * Merge Wikipedia words into dictionary approved files
 * This ensures Wikipedia words pass validation in the game
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'wikipedia-words');
const BACKEND_DIR = path.join(__dirname, '..', 'backend');

// Hebrew final letters normalization (matches backend/dictionary.ts)
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

// Spanish accent normalization (matches backend/dictionary.ts)
const spanishAccentMap = {
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u'
};

function normalizeSpanishWord(word) {
  return word.split('').map(c => {
    const lower = c.toLowerCase();
    return spanishAccentMap[lower] || lower;
  }).join('');
}

// Swedish normalization (lowercase)
function normalizeSwedishWord(word) {
  return word.toLowerCase();
}

// English normalization (lowercase)
function normalizeEnglishWord(word) {
  return word.toLowerCase();
}

// Japanese (keep as-is)
function normalizeJapaneseWord(word) {
  return word;
}

const LANGUAGE_CONFIG = {
  en: {
    file: 'english_words_approved.txt',
    normalize: normalizeEnglishWord,
    wikiFile: 'en.json'
  },
  he: {
    file: 'hebrew_words_approved.txt',
    normalize: normalizeHebrewWord,
    wikiFile: 'he.json'
  },
  sv: {
    file: 'swedish_words_approved.txt',
    normalize: normalizeSwedishWord,
    wikiFile: 'sv.json'
  },
  ja: {
    file: 'japanese_words_approved.txt',
    normalize: normalizeJapaneseWord,
    wikiFile: 'ja.json'
  },
  es: {
    file: 'spanish_words_approved.txt',
    normalize: normalizeSpanishWord,
    wikiFile: 'es.json'
  }
};

function mergeLanguage(language) {
  console.log(`\nMerging ${language.toUpperCase()}...`);

  const config = LANGUAGE_CONFIG[language];
  const approvedFilePath = path.join(BACKEND_DIR, config.file);
  const wikiFilePath = path.join(DATA_DIR, config.wikiFile);

  // Load existing approved words
  let existingWords = new Set();
  if (fs.existsSync(approvedFilePath)) {
    const content = fs.readFileSync(approvedFilePath, 'utf-8');
    existingWords = new Set(
      content
        .split('\n')
        .map(w => w.trim())
        .filter(w => w.length > 0)
    );
  }

  console.log(`  📚 Existing approved words: ${existingWords.size}`);

  // Load Wikipedia words
  const wikiData = JSON.parse(fs.readFileSync(wikiFilePath, 'utf-8'));
  const wikiWords = wikiData.words.map(item => item.word);

  console.log(`  🌐 Wikipedia words: ${wikiWords.length}`);

  // Normalize and merge
  let addedCount = 0;
  const allWords = new Set(existingWords);

  for (const word of wikiWords) {
    const normalized = config.normalize(word);
    if (!allWords.has(normalized)) {
      allWords.add(normalized);
      addedCount++;
    }
  }

  console.log(`  ➕ New words added: ${addedCount}`);
  console.log(`  ✅ Total words: ${allWords.size}`);

  // Sort and save
  const sortedWords = Array.from(allWords).sort();
  fs.writeFileSync(approvedFilePath, sortedWords.join('\n') + '\n');

  const fileSize = (fs.statSync(approvedFilePath).size / 1024).toFixed(1);
  console.log(`  📁 File size: ${fileSize} KB`);

  return {
    language,
    existing: existingWords.size,
    added: addedCount,
    total: allWords.size
  };
}

function mergeAll() {
  console.log('\n📖 MERGING WIKIPEDIA WORDS TO DICTIONARY');
  console.log('Adding Wikipedia words to approved word lists...');
  console.log('='.repeat(70));

  const results = [];

  for (const language of Object.keys(LANGUAGE_CONFIG)) {
    try {
      const result = mergeLanguage(language);
      results.push(result);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));

  const totalExisting = results.reduce((sum, r) => sum + r.existing, 0);
  const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
  const totalFinal = results.reduce((sum, r) => sum + r.total, 0);

  console.log(`\nTotal existing approved words: ${totalExisting}`);
  console.log(`Total Wikipedia words added: ${totalAdded}`);
  console.log(`Total final approved words: ${totalFinal}`);

  console.log('\n📋 BY LANGUAGE:');
  results.forEach(r => {
    const percent = ((r.added / r.total) * 100).toFixed(1);
    console.log(`  ${r.language.toUpperCase()}: ${r.existing} → ${r.total} (+${r.added}, ${percent}% new)`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('✅ MERGE COMPLETE!');
  console.log('Wikipedia words are now in the approved dictionary.');
  console.log('Restart the server to load the updated dictionaries.');
  console.log('='.repeat(70) + '\n');
}

// Run merger
mergeAll();
