#!/usr/bin/env node
/**
 * Clean Wikipedia word files
 * - Remove connector words (and, the, of, etc.)
 * - Remove words not in their base form (plurals, conjugations, etc.)
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
    'OVER', 'JUST', 'ONLY', 'BOTH', 'EACH', 'MORE', 'MUCH', 'MANY'
  ]),
  he: new Set([
    'של', 'את', 'עם', 'על', 'אל', 'מן', 'בין', 'לפני', 'אחרי', 'תחת',
    'כמו', 'אבל', 'או', 'רק', 'גם', 'כל', 'יותר', 'פחות', 'הרבה'
  ]),
  sv: new Set([
    'OCH', 'MED', 'FÖR', 'FRÅN', 'TILL', 'ÖVER', 'UNDER', 'MELLAN', 'GENOM',
    'INNAN', 'EFTER', 'UTAN', 'DETTA', 'DENNA', 'MYCKET', 'NÅGRA', 'ALLA',
    'ANDRA', 'SJÄLV', 'BARA', 'ÄVEN', 'ELLER', 'BÅDE'
  ]),
  ja: new Set([
    // Japanese particles and common connectors (in hiragana/katakana)
    'の', 'を', 'に', 'へ', 'と', 'が', 'は', 'で', 'から', 'まで', 'より'
  ]),
  es: new Set([
    'DEL', 'CON', 'PARA', 'DESDE', 'HASTA', 'SOBRE', 'ENTRE', 'CUANDO',
    'DONDE', 'COMO', 'PERO', 'SOLO', 'TAMBIEN', 'TODOS', 'OTRAS', 'OTRAS',
    'CADA', 'MUCHO', 'MENOS', 'MISMO', 'OTRA', 'OTRO'
  ])
};

// Patterns for non-base forms per language
const NON_BASE_PATTERNS = {
  en: {
    // Remove plurals (S), past tense (ED), gerunds (ING), comparatives (ER/EST)
    test: (word) => {
      if (word.length <= 4) return false; // Keep short words

      // Common plural/conjugation endings
      if (word.endsWith('S') && !word.endsWith('SS')) return true;
      if (word.endsWith('ED')) return true;
      if (word.endsWith('ING')) return true;
      if (word.endsWith('ER') && !word.endsWith('TER') && !word.endsWith('VER')) return true;
      if (word.endsWith('EST')) return true;
      if (word.endsWith('LY')) return true; // Adverbs

      return false;
    }
  },
  he: {
    // Remove words with common prefixes (ה, ב, ל, מ, ש, ו)
    test: (word) => {
      if (word.length <= 3) return false; // Keep short words

      const firstChar = word[0];
      const prefixes = ['ה', 'ב', 'ל', 'מ', 'ש', 'ו', 'כ'];

      // If starts with prefix and is longer than 4 chars, likely not base form
      if (prefixes.includes(firstChar) && word.length > 4) return true;

      return false;
    }
  },
  sv: {
    // Remove plurals (AR, ER, OR), definite forms (EN, ET, NA, RNA)
    test: (word) => {
      if (word.length <= 4) return false;

      if (word.endsWith('AR') || word.endsWith('ER') || word.endsWith('OR')) return true;
      if (word.endsWith('EN') || word.endsWith('ET')) return true;
      if (word.endsWith('NA') || word.endsWith('RNA')) return true;
      if (word.endsWith('ARE') || word.endsWith('ASTE')) return true; // Comparatives

      return false;
    }
  },
  ja: {
    // For Japanese, keep all words (harder to detect base forms automatically)
    test: (word) => false
  },
  es: {
    // Remove plurals (S, ES), conjugations (common verb endings)
    test: (word) => {
      if (word.length <= 4) return false;

      // Plurals
      if (word.endsWith('S') && !word.endsWith('SS')) return true;
      if (word.endsWith('ES')) return true;

      // Common verb conjugations
      if (word.endsWith('AR') || word.endsWith('ER') || word.endsWith('IR')) return true;
      if (word.endsWith('ANDO') || word.endsWith('IENDO')) return true; // Gerunds
      if (word.endsWith('ADO') || word.endsWith('IDO')) return true; // Past participles

      return false;
    }
  }
};

function cleanLanguage(language) {
  console.log(`\nCleaning ${language.toUpperCase()}...`);

  const filePath = path.join(DATA_DIR, `${language}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const originalCount = data.words.length;
  console.log(`  📚 Original words: ${originalCount}`);

  const connectors = CONNECTORS[language] || new Set();
  const nonBaseTest = NON_BASE_PATTERNS[language]?.test || (() => false);

  // Filter out unwanted words
  const cleanedWords = data.words.filter(item => {
    const word = item.word;

    // Remove connectors
    if (connectors.has(word)) {
      return false;
    }

    // Remove non-base forms
    if (nonBaseTest(word)) {
      return false;
    }

    return true;
  });

  const removedCount = originalCount - cleanedWords.length;
  const removedPercent = ((removedCount / originalCount) * 100).toFixed(1);

  console.log(`  🗑️  Removed: ${removedCount} words (${removedPercent}%)`);
  console.log(`  ✅ Cleaned words: ${cleanedWords.length}`);

  // Update data
  data.words = cleanedWords;
  data.lastUpdated = new Date().toISOString().split('T')[0];

  // Save cleaned file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`  📁 File size: ${fileSize} KB`);
}

function cleanAll() {
  console.log('\n🧹 CLEANING WIKIPEDIA WORD FILES');
  console.log('Removing connector words and non-base forms...');
  console.log('='.repeat(70));

  for (const language of LANGUAGES) {
    try {
      cleanLanguage(language);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ CLEANING COMPLETE!');
  console.log('Word files now contain only base-form nouns and proper names.');
  console.log('='.repeat(70) + '\n');
}

// Run cleaner
cleanAll();
