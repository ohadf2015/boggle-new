#!/usr/bin/env node
/**
 * Verify all Wikipedia word JSON files load correctly
 * Checks structure, validation, and statistics
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'wikipedia-words');
const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

console.log('\n=== Verifying Wikipedia Word Files ===\n');

let allValid = true;
const results = {};

for (const lang of LANGUAGES) {
  const filePath = path.join(DATA_DIR, `${lang}.json`);

  try {
    console.log(`Checking ${lang}.json...`);

    // Check file exists
    if (!fs.existsSync(filePath)) {
      console.log(`  ❌ File not found`);
      allValid = false;
      continue;
    }

    // Load and parse JSON
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Validate structure
    if (!data.language || !data.lastUpdated || !Array.isArray(data.words)) {
      console.log(`  ❌ Invalid structure`);
      allValid = false;
      continue;
    }

    // Check language code
    if (data.language !== lang) {
      console.log(`  ⚠️  Language mismatch: expected ${lang}, got ${data.language}`);
    }

    // Validate words
    let validWords = 0;
    let invalidWords = 0;
    const seenWords = new Set();

    for (const wordData of data.words) {
      // Check required fields
      if (!wordData.word || !wordData.source || !wordData.score) {
        invalidWords++;
        continue;
      }

      // Check for duplicates
      if (seenWords.has(wordData.word)) {
        console.log(`  ⚠️  Duplicate word: ${wordData.word}`);
        invalidWords++;
        continue;
      }
      seenWords.add(wordData.word);

      // Validate word format based on language
      const word = wordData.word;
      let isValid = false;

      switch (lang) {
        case 'en':
        case 'sv':
        case 'es':
          // Latin alphabet (with Swedish/Spanish special chars)
          isValid = word.length >= 4 && word.length <= 8 &&
                   /^[A-ZÅÄÖÁÉÍÓÚÑÜ]+$/.test(word);
          break;
        case 'he':
          // Hebrew characters
          isValid = word.length >= 4 && word.length <= 8 &&
                   /^[\u0590-\u05FF]+$/.test(word);
          break;
        case 'ja':
          // Japanese characters (2-4 length)
          isValid = word.length >= 2 && word.length <= 4 &&
                   /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/.test(word);
          break;
      }

      if (isValid) {
        validWords++;
      } else {
        invalidWords++;
      }
    }

    const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1);

    results[lang] = {
      totalWords: data.words.length,
      validWords,
      invalidWords,
      fileSize,
      lastUpdated: data.lastUpdated
    };

    console.log(`  ✅ Valid: ${validWords} words`);
    if (invalidWords > 0) {
      console.log(`  ⚠️  Invalid: ${invalidWords} words`);
    }
    console.log(`  📁 File size: ${fileSize} KB`);
    console.log(`  📅 Last updated: ${data.lastUpdated}`);

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    allValid = false;
  }

  console.log('');
}

// Summary table
console.log('=== Summary ===\n');
console.log('Language | Total Words | Valid | File Size | Last Updated');
console.log('---------|-------------|-------|-----------|-------------');
for (const lang of LANGUAGES) {
  if (results[lang]) {
    const r = results[lang];
    console.log(
      `${lang.padEnd(8)} | ${String(r.totalWords).padStart(11)} | ` +
      `${String(r.validWords).padStart(5)} | ${r.fileSize.padStart(9)} KB | ${r.lastUpdated}`
    );
  } else {
    console.log(`${lang.padEnd(8)} | MISSING OR INVALID`);
  }
}

console.log('\n' + '='.repeat(70));
if (allValid) {
  console.log('✅ All files are valid and ready for production!');
} else {
  console.log('❌ Some files have errors. Please fix them before deploying.');
}
console.log('='.repeat(70) + '\n');

process.exit(allValid ? 0 : 1);
