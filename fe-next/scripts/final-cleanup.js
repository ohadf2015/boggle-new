#!/usr/bin/env node
/**
 * Final cleanup of Wikipedia words and dictionary
 * - Keep only 4+ chars for Hebrew, English, Spanish, Swedish
 * - Remove Hebrew punctuation (nikud, gershayim, geresh)
 * - Keep Japanese 2-4 chars
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'wikipedia-words');
const BACKEND_DIR = path.join(__dirname, '..', 'backend');

// Hebrew punctuation marks to remove (nikud vowels, gershayim, geresh)
const HEBREW_PUNCTUATION = /[\u0591-\u05C7\u05F3\u05F4]/g;

function removeHebrewPunctuation(word) {
  return word.replace(HEBREW_PUNCTUATION, '');
}

// Language config
const WIKI_FILES = {
  en: { file: 'en.json', minLen: 4, maxLen: 8, removePunct: false },
  he: { file: 'he.json', minLen: 4, maxLen: 8, removePunct: true },
  sv: { file: 'sv.json', minLen: 4, maxLen: 8, removePunct: false },
  ja: { file: 'ja.json', minLen: 2, maxLen: 4, removePunct: false },
  es: { file: 'es.json', minLen: 4, maxLen: 8, removePunct: false }
};

const APPROVED_FILES = {
  en: { file: 'english_words_approved.txt', minLen: 4, removePunct: false },
  he: { file: 'hebrew_words_approved.txt', minLen: 4, removePunct: true },
  sv: { file: 'swedish_words_approved.txt', minLen: 4, removePunct: false },
  ja: { file: 'japanese_words_approved.txt', minLen: 2, removePunct: false },
  es: { file: 'spanish_words_approved.txt', minLen: 4, removePunct: false }
};

function cleanupWikipediaFile(language) {
  console.log(`\nCleaning Wikipedia ${language.toUpperCase()}...`);

  const config = WIKI_FILES[language];
  const filePath = path.join(DATA_DIR, config.file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const originalCount = data.words.length;
  const cleanedWords = [];
  const seen = new Set();
  let removedLength = 0;
  let removedPunctuation = 0;
  let removedDuplicates = 0;

  for (const item of data.words) {
    let word = item.word;

    // Remove Hebrew punctuation
    if (config.removePunct) {
      const withoutPunct = removeHebrewPunctuation(word);
      if (withoutPunct !== word) {
        removedPunctuation++;
        word = withoutPunct;
      }
    }

    // Skip if empty after punctuation removal
    if (!word || word.length === 0) {
      removedPunctuation++;
      continue;
    }

    // Length check
    if (word.length < config.minLen || word.length > config.maxLen) {
      removedLength++;
      continue;
    }

    // Skip duplicates
    if (seen.has(word)) {
      removedDuplicates++;
      continue;
    }

    cleanedWords.push({ ...item, word });
    seen.add(word);
  }

  const removedTotal = originalCount - cleanedWords.length;

  console.log(`  📚 Original: ${originalCount} words`);
  console.log(`  🗑️  Removed:`);
  console.log(`      - Invalid length (<${config.minLen} chars): ${removedLength}`);
  if (config.removePunct) {
    console.log(`      - Hebrew punctuation: ${removedPunctuation}`);
  }
  console.log(`      - Duplicates: ${removedDuplicates}`);
  console.log(`      - Total: ${removedTotal}`);
  console.log(`  ✅ Final: ${cleanedWords.length} words`);

  // Update and save
  data.words = cleanedWords;
  data.lastUpdated = new Date().toISOString().split('T')[0];
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`  📁 File size: ${fileSize} KB`);

  return {
    language,
    original: originalCount,
    final: cleanedWords.length,
    removed: removedTotal
  };
}

function cleanupApprovedFile(language) {
  console.log(`\nCleaning Approved ${language.toUpperCase()}...`);

  const config = APPROVED_FILES[language];
  const filePath = path.join(BACKEND_DIR, config.file);

  // Load existing words
  const content = fs.readFileSync(filePath, 'utf-8');
  const words = content.split('\n').map(w => w.trim()).filter(w => w.length > 0);

  const originalCount = words.length;
  const cleanedWords = new Set();
  let removedLength = 0;
  let removedPunctuation = 0;

  for (let word of words) {
    // Remove Hebrew punctuation
    if (config.removePunct) {
      const withoutPunct = removeHebrewPunctuation(word);
      if (withoutPunct !== word) {
        removedPunctuation++;
        word = withoutPunct;
      }
    }

    // Skip if empty
    if (!word || word.length === 0) {
      removedPunctuation++;
      continue;
    }

    // Length check
    if (word.length < config.minLen) {
      removedLength++;
      continue;
    }

    cleanedWords.add(word);
  }

  const removedTotal = originalCount - cleanedWords.size;

  console.log(`  📚 Original: ${originalCount} words`);
  console.log(`  🗑️  Removed:`);
  console.log(`      - Length <${config.minLen} chars: ${removedLength}`);
  if (config.removePunct) {
    console.log(`      - Hebrew punctuation: ${removedPunctuation}`);
  }
  console.log(`      - Total: ${removedTotal}`);
  console.log(`  ✅ Final: ${cleanedWords.size} words`);

  // Sort and save
  const sortedWords = Array.from(cleanedWords).sort();
  fs.writeFileSync(filePath, sortedWords.join('\n') + '\n');

  const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`  📁 File size: ${fileSize} KB`);

  return {
    language,
    original: originalCount,
    final: cleanedWords.size,
    removed: removedTotal
  };
}

function cleanup() {
  console.log('\n🧹 FINAL CLEANUP');
  console.log('Enforcing 4+ chars for Hebrew/English/Spanish/Swedish');
  console.log('Removing Hebrew punctuation marks');
  console.log('='.repeat(70));

  console.log('\n📄 WIKIPEDIA FILES:');
  const wikiResults = [];
  for (const language of Object.keys(WIKI_FILES)) {
    try {
      const result = cleanupWikipediaFile(language);
      wikiResults.push(result);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n📖 APPROVED DICTIONARY FILES:');
  const approvedResults = [];
  for (const language of Object.keys(APPROVED_FILES)) {
    try {
      const result = cleanupApprovedFile(language);
      approvedResults.push(result);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));

  const wikiTotal = wikiResults.reduce((sum, r) => sum + r.final, 0);
  const approvedTotal = approvedResults.reduce((sum, r) => sum + r.final, 0);
  const wikiRemoved = wikiResults.reduce((sum, r) => sum + r.removed, 0);
  const approvedRemoved = approvedResults.reduce((sum, r) => sum + r.removed, 0);

  console.log(`\n📄 Wikipedia Files:`);
  console.log(`   Total words: ${wikiTotal}`);
  console.log(`   Removed: ${wikiRemoved}`);

  console.log(`\n📖 Approved Files:`);
  console.log(`   Total words: ${approvedTotal}`);
  console.log(`   Removed: ${approvedRemoved}`);

  console.log('\n📋 BY LANGUAGE (Final Counts):');
  for (let i = 0; i < wikiResults.length; i++) {
    const wiki = wikiResults[i];
    const approved = approvedResults[i];
    console.log(`   ${wiki.language.toUpperCase()}: Wiki=${wiki.final}, Approved=${approved.final}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ FINAL CLEANUP COMPLETE!');
  console.log('All words are now 4+ characters (except Japanese: 2-4)');
  console.log('Hebrew punctuation removed from all files');
  console.log('='.repeat(70) + '\n');
}

cleanup();
