#!/usr/bin/env node
/**
 * Fix specific validation errors
 * - Remove single-char Japanese words
 * - Remove over-length words
 * - Remove punctuation
 * - Remove Roman numerals
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'wikipedia-words');
const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

function removePunctuation(word) {
  return word.replace(/[.,'\-"'"`´]/g, '');
}

function fixLanguage(language) {
  console.log(`\nFixing ${language.toUpperCase()}...`);

  const filePath = path.join(DATA_DIR, `${language}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const originalCount = data.words.length;

  const fixedWords = [];
  let removedLength = 0;
  let removedRomanNumerals = 0;
  let cleanedPunctuation = 0;
  const seen = new Set();

  for (const item of data.words) {
    let word = item.word;

    // Remove punctuation
    const withoutPunct = removePunctuation(word);
    if (withoutPunct !== word) {
      cleanedPunctuation++;
      word = withoutPunct;
    }

    // Length validation
    const minLen = language === 'ja' ? 2 : 4;
    const maxLen = language === 'ja' ? 4 : 8;

    if (word.length < minLen || word.length > maxLen) {
      removedLength++;
      continue;
    }

    // Remove Roman numerals (VIII, XIII, etc.)
    if (/^[IVX]+$/.test(word) && word.length >= 2) {
      removedRomanNumerals++;
      continue;
    }

    // Skip duplicates
    if (seen.has(word)) {
      continue;
    }

    fixedWords.push({
      ...item,
      word: word
    });
    seen.add(word);
  }

  const removedTotal = originalCount - fixedWords.length;

  console.log(`  📚 Original: ${originalCount} words`);
  console.log(`  ✨ Cleaned punctuation: ${cleanedPunctuation}`);
  console.log(`  🗑️  Removed:`);
  console.log(`      - Invalid length: ${removedLength}`);
  console.log(`      - Roman numerals: ${removedRomanNumerals}`);
  console.log(`      - Total: ${removedTotal}`);
  console.log(`  ✅ Final: ${fixedWords.length} words`);

  // Update data
  data.words = fixedWords;
  data.lastUpdated = new Date().toISOString().split('T')[0];

  // Save
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`  📁 File size: ${fileSize} KB`);

  return {
    language,
    original: originalCount,
    final: fixedWords.length,
    removed: removedTotal
  };
}

function fixAll() {
  console.log('\n🔧 FIXING VALIDATION ERRORS');
  console.log('='.repeat(70));

  const results = [];

  for (const language of LANGUAGES) {
    try {
      const result = fixLanguage(language);
      results.push(result);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));

  const totalOriginal = results.reduce((sum, r) => sum + r.original, 0);
  const totalFinal = results.reduce((sum, r) => sum + r.final, 0);
  const totalRemoved = results.reduce((sum, r) => sum + r.removed, 0);

  console.log(`\nTotal before: ${totalOriginal}`);
  console.log(`Total after: ${totalFinal}`);
  console.log(`Total removed: ${totalRemoved}`);

  console.log('\n' + '='.repeat(70));
  console.log('✅ FIXES COMPLETE!');
  console.log('='.repeat(70) + '\n');
}

fixAll();
