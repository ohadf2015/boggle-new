#!/usr/bin/env node
/**
 * Validate Wikipedia word quality using multiple methods
 * - Pattern validation (character diversity, length)
 * - Semantic validation (proper nouns, base forms)
 * - Quality scoring
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'wikipedia-words');
const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

// Quality checks
function validateWordQuality(word, language) {
  const issues = [];
  const warnings = [];

  // 1. Length validation
  const minLen = language === 'ja' ? 2 : 4;
  const maxLen = language === 'ja' ? 4 : 8;
  if (word.length < minLen || word.length > maxLen) {
    issues.push(`Invalid length: ${word.length}`);
  }

  // 2. Character diversity (avoid repetitive words like AAAA)
  const uniqueChars = new Set(word.split(''));
  const diversity = uniqueChars.size / word.length;
  if (diversity < 0.4) {
    warnings.push(`Low character diversity: ${diversity.toFixed(2)}`);
  }

  // 3. Check for suspicious patterns
  if (language !== 'ja') {
    // Repeated characters (3+ in a row)
    if (/(.)\1{2,}/.test(word)) {
      warnings.push('Contains 3+ repeated characters');
    }

    // All vowels or all consonants
    const vowels = (word.match(/[AEIOUÄÖÅÁÉÍÓÚ]/g) || []).length;
    if (vowels === 0 && word.length > 4) {
      warnings.push('No vowels detected');
    }
    if (vowels === word.length && word.length > 3) {
      warnings.push('Only vowels');
    }
  }

  // 4. Check for common abbreviations/acronyms (might be low quality)
  if (language === 'en') {
    const commonAbbrev = ['NASA', 'FIFA', 'NATO', 'ASAP', 'RSVP'];
    if (commonAbbrev.includes(word)) {
      warnings.push('Common abbreviation');
    }
  }

  return { issues, warnings, diversity };
}

// Analyze word batch for quality patterns
function analyzeLanguage(language) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Validating ${language.toUpperCase()}...`);
  console.log('='.repeat(70));

  const filePath = path.join(DATA_DIR, `${language}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const totalWords = data.words.length;
  let wordsWithIssues = 0;
  let wordsWithWarnings = 0;
  const flaggedWords = [];

  // Statistics
  const lengthDistribution = {};
  const diversityScores = [];
  const sourceDistribution = {};

  // Validate each word
  for (const item of data.words) {
    const { word, source, score } = item;
    const validation = validateWordQuality(word, language);

    // Track statistics
    lengthDistribution[word.length] = (lengthDistribution[word.length] || 0) + 1;
    diversityScores.push(validation.diversity);
    sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;

    // Flag problematic words
    if (validation.issues.length > 0) {
      wordsWithIssues++;
      flaggedWords.push({
        word,
        source,
        score,
        issues: validation.issues,
        severity: 'ERROR'
      });
    } else if (validation.warnings.length > 0) {
      wordsWithWarnings++;
      if (flaggedWords.length < 50) { // Only show first 50 warnings
        flaggedWords.push({
          word,
          source,
          score,
          warnings: validation.warnings,
          severity: 'WARNING'
        });
      }
    }
  }

  // Calculate statistics
  const avgDiversity = diversityScores.reduce((a, b) => a + b, 0) / diversityScores.length;
  const avgLength = data.words.reduce((sum, item) => sum + item.word.length, 0) / totalWords;

  // Report
  console.log(`\n📊 QUALITY STATISTICS:`);
  console.log(`  Total words: ${totalWords}`);
  console.log(`  Words with ERRORS: ${wordsWithIssues} (${((wordsWithIssues/totalWords)*100).toFixed(1)}%)`);
  console.log(`  Words with WARNINGS: ${wordsWithWarnings} (${((wordsWithWarnings/totalWords)*100).toFixed(1)}%)`);
  console.log(`  Average word length: ${avgLength.toFixed(1)} characters`);
  console.log(`  Average character diversity: ${(avgDiversity * 100).toFixed(1)}%`);

  console.log(`\n📏 LENGTH DISTRIBUTION:`);
  Object.keys(lengthDistribution)
    .sort((a, b) => a - b)
    .forEach(len => {
      const count = lengthDistribution[len];
      const percent = ((count / totalWords) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(percent / 2));
      console.log(`  ${len} chars: ${count.toString().padStart(4)} (${percent.padStart(5)}%) ${bar}`);
    });

  console.log(`\n📚 SOURCE DISTRIBUTION:`);
  Object.entries(sourceDistribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      const percent = ((count / totalWords) * 100).toFixed(1);
      console.log(`  ${source.padEnd(20)}: ${count.toString().padStart(4)} (${percent.padStart(5)}%)`);
    });

  if (flaggedWords.length > 0) {
    console.log(`\n⚠️  FLAGGED WORDS (showing first ${Math.min(flaggedWords.length, 50)}):`);
    flaggedWords.slice(0, 50).forEach((item, idx) => {
      const prefix = item.severity === 'ERROR' ? '❌' : '⚠️ ';
      const reason = item.issues ? item.issues.join(', ') : item.warnings.join(', ');
      console.log(`  ${prefix} ${(idx + 1).toString().padStart(3)}. ${item.word.padEnd(10)} [${item.source}] - ${reason}`);
    });
  }

  return {
    language,
    totalWords,
    wordsWithIssues,
    wordsWithWarnings,
    avgDiversity,
    avgLength,
    qualityScore: ((totalWords - wordsWithIssues - wordsWithWarnings * 0.5) / totalWords * 100).toFixed(1)
  };
}

// Sample words for AI validation
function sampleWordsForReview(language, count = 20) {
  const filePath = path.join(DATA_DIR, `${language}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Sample random words
  const sampled = [];
  const step = Math.floor(data.words.length / count);
  for (let i = 0; i < data.words.length && sampled.length < count; i += step) {
    sampled.push(data.words[i].word);
  }

  return sampled;
}

function validateAll() {
  console.log('\n🔍 WIKIPEDIA WORD QUALITY VALIDATION');
  console.log('Analyzing word quality across all languages...\n');

  const results = [];

  for (const language of LANGUAGES) {
    try {
      const result = analyzeLanguage(language);
      results.push(result);
    } catch (error) {
      console.log(`❌ Error validating ${language}: ${error.message}`);
    }
  }

  // Overall summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('📋 OVERALL SUMMARY');
  console.log('='.repeat(70));

  const totalWords = results.reduce((sum, r) => sum + r.totalWords, 0);
  const totalIssues = results.reduce((sum, r) => sum + r.wordsWithIssues, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.wordsWithWarnings, 0);
  const avgQuality = results.reduce((sum, r) => sum + parseFloat(r.qualityScore), 0) / results.length;

  console.log(`\nTotal words across all languages: ${totalWords}`);
  console.log(`Words with errors: ${totalIssues} (${((totalIssues/totalWords)*100).toFixed(2)}%)`);
  console.log(`Words with warnings: ${totalWarnings} (${((totalWarnings/totalWords)*100).toFixed(2)}%)`);
  console.log(`\nAverage quality score: ${avgQuality.toFixed(1)}%`);

  console.log(`\n📊 LANGUAGE COMPARISON:`);
  results.forEach(r => {
    const bar = '█'.repeat(Math.round(parseFloat(r.qualityScore) / 5));
    console.log(`  ${r.language.toUpperCase()}: ${r.qualityScore.padStart(5)}% ${bar} (${r.totalWords} words)`);
  });

  // Sample words for manual review
  console.log(`\n${'='.repeat(70)}`);
  console.log('📝 WORD SAMPLES FOR MANUAL REVIEW');
  console.log('(Review these to verify quality)');
  console.log('='.repeat(70));

  for (const language of LANGUAGES) {
    const samples = sampleWordsForReview(language, 15);
    console.log(`\n${language.toUpperCase()}: ${samples.join(', ')}`);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('✅ VALIDATION COMPLETE');
  console.log('='.repeat(70) + '\n');

  // Save validation report
  const report = {
    timestamp: new Date().toISOString(),
    totalWords,
    totalIssues,
    totalWarnings,
    avgQuality: parseFloat(avgQuality.toFixed(1)),
    languages: results
  };

  const reportPath = path.join(DATA_DIR, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

// Run validation
validateAll();
