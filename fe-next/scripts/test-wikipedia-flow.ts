/**
 * Test Wikipedia Word Flow Locally
 * Tests fetching and extracting words without database
 */

import {
  fetchFeaturedContent,
  extractWordsFromFeaturedContent,
  fetchRandomArticles
} from '../backend/services/wikipediaWordFetcher';
import {
  rankWordsByInterest,
  validateGameWord
} from '../utils/dailyChallenge/wikipediaWordProcessor';
import type { Language } from '../shared/types/game';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Test Wikipedia word extraction for a single language
 */
async function testLanguage(language: Language, date: Date) {
  const dateStr = date.toISOString().split('T')[0];

  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Testing Wikipedia Flow for: ${language.toUpperCase()} on ${dateStr}`, 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    // Step 1: Fetch featured content
    log('\n[1/5] Fetching featured content from Wikipedia...', 'blue');
    const featuredContent = await fetchFeaturedContent(language, date);

    if (!featuredContent) {
      log('❌ No featured content available for this date', 'red');

      // Try random articles as fallback
      log('\n[Fallback] Trying random articles...', 'yellow');
      const randomArticles = await fetchRandomArticles(language, 5);

      if (randomArticles.length === 0) {
        log('❌ No random articles found either', 'red');
        return;
      }

      log(`✓ Found ${randomArticles.length} random articles`, 'green');
      randomArticles.forEach((article, i) => {
        log(`  ${i + 1}. ${article.title}`, 'reset');
      });

      // Extract words from random article titles
      const rawCandidates = randomArticles
        .filter(a => a.title)
        .map(a => ({
          word: a.title,
          source: 'random',
          url: a.content_urls?.desktop?.page
        }));

      // Rank the words
      log('\n[2/5] Ranking words by interestingness...', 'blue');
      const rankedWords = rankWordsByInterest(rawCandidates, language);

      if (rankedWords.length === 0) {
        log('❌ No valid words after ranking', 'red');
        return;
      }

      log(`✓ Found ${rankedWords.length} valid candidate words`, 'green');

      // Display top 10 words
      log('\n[3/5] Top 10 Words:', 'blue');
      rankedWords.slice(0, 10).forEach((word, i) => {
        log(`  ${i + 1}. ${word.word} (score: ${word.score}, source: ${word.source})`, 'magenta');
      });

      return;
    }

    log('✓ Featured content fetched successfully', 'green');

    // Show what was found
    if (featuredContent.tfa) {
      log(`  • Today's Featured Article: ${featuredContent.tfa.title}`, 'reset');
    }
    if (featuredContent.mostread?.articles) {
      log(`  • Most Read Articles: ${featuredContent.mostread.articles.length} found`, 'reset');
    }
    if (featuredContent.onthisday) {
      log(`  • On This Day Events: ${featuredContent.onthisday.length} found`, 'reset');
    }

    // Step 2: Extract candidate words
    log('\n[2/5] Extracting candidate words...', 'blue');
    const rawCandidates = extractWordsFromFeaturedContent(featuredContent, language);

    if (rawCandidates.length === 0) {
      log('❌ No words extracted from featured content', 'red');
      return;
    }

    log(`✓ Extracted ${rawCandidates.length} raw candidate words`, 'green');

    // Step 3: Rank words by interestingness
    log('\n[3/5] Ranking words by interestingness...', 'blue');
    const rankedWords = rankWordsByInterest(rawCandidates, language);

    if (rankedWords.length === 0) {
      log('❌ No valid words after ranking', 'red');
      return;
    }

    log(`✓ Found ${rankedWords.length} valid candidate words after ranking`, 'green');

    // Step 4: Display top 10 words
    log('\n[4/5] Top 10 Words (by interestingness score):', 'blue');
    rankedWords.slice(0, 10).forEach((word, i) => {
      const validation = validateGameWord(word.word, language);
      const validMark = validation.valid ? '✓' : '✗';
      log(
        `  ${i + 1}. ${validMark} ${word.word} (score: ${word.score}, source: ${word.source})`,
        validation.valid ? 'magenta' : 'red'
      );
      if (!validation.valid) {
        log(`     Reason: ${validation.reason}`, 'red');
      }
    });

    // Step 5: Show distribution by source
    log('\n[5/5] Word Source Distribution:', 'blue');
    const sourceCount: Record<string, number> = {};
    rankedWords.forEach(word => {
      sourceCount[word.source] = (sourceCount[word.source] || 0) + 1;
    });

    Object.entries(sourceCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        log(`  • ${source}: ${count} words`, 'reset');
      });

    // Success summary
    log('\n✓ Wikipedia flow test completed successfully!', 'green');
    log(`  Total valid words: ${rankedWords.length}`, 'green');
    log(`  Best word: ${rankedWords[0]?.word} (score: ${rankedWords[0]?.score})`, 'green');

  } catch (error) {
    log('\n❌ Error during Wikipedia flow test:', 'red');
    if (error instanceof Error) {
      log(`  ${error.message}`, 'red');
      if (error.stack) {
        log(`\nStack trace:`, 'yellow');
        log(error.stack, 'yellow');
      }
    } else {
      log(`  ${String(error)}`, 'red');
    }
  }
}

/**
 * Main test runner
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const language = (args[0] || 'en') as Language;
  const dateStr = args[1] || new Date().toISOString().split('T')[0];
  const date = new Date(dateStr);

  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         Wikipedia Word Flow - Local Test Runner          ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  log('\nConfiguration:', 'blue');
  log(`  Language: ${language}`, 'reset');
  log(`  Date: ${dateStr}`, 'reset');

  // Test the specified language
  await testLanguage(language, date);

  log('\n' + '='.repeat(60), 'cyan');
  log('Test completed!', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');
}

// Run the test
main().catch(error => {
  log('\n❌ Fatal error:', 'red');
  console.error(error);
  process.exit(1);
});
