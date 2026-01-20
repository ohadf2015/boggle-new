#!/usr/bin/env node
/**
 * Improved Wikipedia word cleaner
 * - Remove punctuation from words
 * - Remove connector words
 * - Smarter base-form detection (less aggressive)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'wikipedia-words');
const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

// Connector words to remove per language
const CONNECTORS = {
  en: new Set([
    'THE', 'AND', 'FOR', 'WITH', 'FROM', 'THAT', 'THIS', 'THESE', 'THOSE',
    'ABOUT', 'INTO', 'THROUGH', 'DURING', 'BEFORE', 'AFTER', 'ABOVE', 'BELOW',
    'BETWEEN', 'UNDER', 'AGAIN', 'FURTHER', 'THEN', 'ONCE', 'HERE', 'THERE',
    'WHEN', 'WHERE', 'WHICH', 'WHILE', 'VERY', 'BEEN', 'BEING', 'HAVE',
    'DOES', 'HAVING', 'OTHER', 'SOME', 'SUCH', 'THAN', 'MOST', 'ALSO',
    'OVER', 'JUST', 'ONLY', 'BOTH', 'EACH', 'MORE', 'MUCH', 'MANY', 'WHAT'
  ]),
  he: new Set([
    'של', 'את', 'עם', 'על', 'אל', 'מן', 'בין', 'לפני', 'אחרי', 'תחת',
    'כמו', 'אבל', 'או', 'רק', 'גם', 'כל', 'יותר', 'פחות', 'הרבה', 'זה', 'זאת'
  ]),
  sv: new Set([
    'OCH', 'MED', 'FÖR', 'FRÅN', 'TILL', 'ÖVER', 'UNDER', 'MELLAN', 'GENOM',
    'INNAN', 'EFTER', 'UTAN', 'DETTA', 'DENNA', 'MYCKET', 'NÅGRA', 'ALLA',
    'ANDRA', 'SJÄLV', 'BARA', 'ÄVEN', 'ELLER', 'BÅDE', 'VARJE'
  ]),
  ja: new Set([
    // Japanese particles
    'の', 'を', 'に', 'へ', 'と', 'が', 'は', 'で', 'から', 'まで', 'より'
  ]),
  es: new Set([
    'DEL', 'CON', 'PARA', 'DESDE', 'HASTA', 'SOBRE', 'ENTRE', 'CUANDO',
    'DONDE', 'COMO', 'PERO', 'SOLO', 'TAMBIEN', 'TODOS', 'TODAS', 'OTRA',
    'OTRO', 'CADA', 'MUCHO', 'MENOS', 'MISMO', 'MISMA', 'CUAL'
  ])
};

// Remove punctuation and special characters
function removePunctuation(word) {
  // Remove common punctuation: periods, commas, apostrophes, hyphens, quotes
  return word.replace(/[.,'\-"'"`]/g, '');
}

// Smarter non-base form detection
const NON_BASE_PATTERNS = {
  en: {
    test: (word) => {
      if (word.length <= 4) return false;

      // Only remove obvious plurals and conjugations
      if (word.endsWith('S') && !word.endsWith('SS') && !word.endsWith('US')) {
        // Keep words ending in -IES, -ES that might be base forms
        if (word.endsWith('IES') || word.endsWith('ES')) return false;
        return true;
      }
      if (word.endsWith('ED') && word.length > 5) return true;
      if (word.endsWith('ING') && word.length > 5) return true;
      if (word.endsWith('LY')) return true; // Adverbs

      return false;
    }
  },
  he: {
    test: (word) => {
      if (word.length <= 3) return false;

      // IMPROVED: Only remove if it's CLEARLY a prefixed form
      // Remove only ה + very short word (likely "the something")
      if (word[0] === 'ה' && word.length === 4) return true;

      // Keep everything else - מ, ש, ו, ב, ל, כ can be part of the word itself
      return false;
    }
  },
  sv: {
    test: (word) => {
      if (word.length <= 4) return false;

      // Only remove obvious plurals and definite forms
      if (word.endsWith('NA') || word.endsWith('RNA')) return true;
      if (word.endsWith('EN') || word.endsWith('ET')) return true;
      if (word.endsWith('ARE') || word.endsWith('ASTE')) return true;

      return false;
    }
  },
  ja: {
    test: (word) => false // Keep all Japanese words
  },
  es: {
    test: (word) => {
      if (word.length <= 4) return false;

      // Only remove obvious plurals
      if (word.endsWith('S') && !word.endsWith('SS')) return true;
      if (word.endsWith('ANDO') || word.endsWith('IENDO')) return true; // Gerunds
      if (word.endsWith('ADO') || word.endsWith('IDO')) return true; // Past participles

      return false;
    }
  }
};

// Check if word contains only valid characters
function hasValidCharacters(word, language) {
  const patterns = {
    en: /^[A-Z]+$/,
    he: /^[\u0590-\u05FF]+$/,
    sv: /^[A-ZÅÄÖ]+$/,
    ja: /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/,
    es: /^[A-ZÁÉÍÓÚÑÜ]+$/
  };

  return patterns[language]?.test(word) || false;
}

function cleanLanguage(language) {
  console.log(`\nCleaning ${language.toUpperCase()}...`);

  const filePath = path.join(DATA_DIR, `${language}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const originalCount = data.words.length;
  console.log(`  📚 Original words: ${originalCount}`);

  const connectors = CONNECTORS[language] || new Set();
  const nonBaseTest = NON_BASE_PATTERNS[language]?.test || (() => false);

  // Clean and filter words
  const cleanedWords = [];
  const seen = new Set();
  let removedPunctuation = 0;
  let removedConnectors = 0;
  let removedNonBase = 0;
  let removedInvalid = 0;
  let removedDuplicates = 0;

  for (const item of data.words) {
    const originalWord = item.word;

    // Step 1: Remove punctuation
    const noPunctuation = removePunctuation(originalWord);
    if (noPunctuation !== originalWord) {
      removedPunctuation++;
    }

    const word = noPunctuation;

    // Step 2: Check if valid characters
    if (!hasValidCharacters(word, language)) {
      removedInvalid++;
      continue;
    }

    // Step 3: Check for duplicates
    if (seen.has(word)) {
      removedDuplicates++;
      continue;
    }

    // Step 4: Remove connectors
    if (connectors.has(word)) {
      removedConnectors++;
      continue;
    }

    // Step 5: Remove non-base forms
    if (nonBaseTest(word)) {
      removedNonBase++;
      continue;
    }

    // Keep the word
    cleanedWords.push({
      ...item,
      word: word
    });
    seen.add(word);
  }

  const removedTotal = originalCount - cleanedWords.length;
  const removedPercent = ((removedTotal / originalCount) * 100).toFixed(1);

  console.log(`  🗑️  Removed breakdown:`);
  console.log(`      - Punctuation cleaned: ${removedPunctuation}`);
  console.log(`      - Duplicates: ${removedDuplicates}`);
  console.log(`      - Connectors: ${removedConnectors}`);
  console.log(`      - Non-base forms: ${removedNonBase}`);
  console.log(`      - Invalid characters: ${removedInvalid}`);
  console.log(`  📊 Total removed: ${removedTotal} words (${removedPercent}%)`);
  console.log(`  ✅ Clean words: ${cleanedWords.length}`);

  // Update data
  data.words = cleanedWords;
  data.lastUpdated = new Date().toISOString().split('T')[0];

  // Save cleaned file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`  📁 File size: ${fileSize} KB`);

  return {
    language,
    originalCount,
    cleanedCount: cleanedWords.length,
    removedPunctuation,
    removedDuplicates,
    removedConnectors,
    removedNonBase,
    removedInvalid
  };
}

function cleanAll() {
  console.log('\n🧹 CLEANING WIKIPEDIA WORD FILES V2');
  console.log('Improved cleaning with punctuation removal and smarter Hebrew logic');
  console.log('='.repeat(70));

  const results = [];

  for (const language of LANGUAGES) {
    try {
      const result = cleanLanguage(language);
      results.push(result);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));

  const totalOriginal = results.reduce((sum, r) => sum + r.originalCount, 0);
  const totalCleaned = results.reduce((sum, r) => sum + r.cleanedCount, 0);
  const totalRemoved = totalOriginal - totalCleaned;

  console.log(`\nTotal original words: ${totalOriginal}`);
  console.log(`Total cleaned words: ${totalCleaned}`);
  console.log(`Total removed: ${totalRemoved} (${((totalRemoved/totalOriginal)*100).toFixed(1)}%)`);

  console.log('\n' + '='.repeat(70));
  console.log('✅ CLEANING COMPLETE!');
  console.log('='.repeat(70) + '\n');
}

// Run cleaner
cleanAll();
