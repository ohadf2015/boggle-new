/**
 * Enrich word databases with real Wikipedia words
 * Fetches words from Wikipedia API and merges with existing curated words
 */

import type { Language } from '@/shared/types/game';
import fs from 'fs';
import path from 'path';
import {
  fetchFeaturedContent,
  extractWordsFromFeaturedContent
} from '../backend/services/wikipediaWordFetcher';
import { rankWordsByInterest } from '@/utils/dailyChallenge/wikipediaWordProcessor';

const DATA_DIR = path.join(__dirname, '..', 'data', 'wikipedia-words');
const LANGUAGES: Language[] = ['en', 'he', 'sv', 'ja', 'es'];

// Helper to calculate interestingness score
function calculateScore(word: string, source: string, language: Language): number {
  // Base score
  let score = 50;

  // Source bonus (Wikipedia trending content is more interesting)
  if (source === 'tfa_title') score += 20;
  else if (source === 'onthisday_title') score += 15;
  else if (source === 'mostread_title') score += 10;

  // Length bonus (longer words often more interesting)
  if (language === 'ja') {
    // Japanese: 3-4 chars preferred
    if (word.length >= 3) score += 5;
  } else {
    // Other languages: 6-8 chars preferred
    if (word.length >= 6) score += 5;
    if (word.length >= 7) score += 3;
  }

  // Character variety bonus (check for repeated chars)
  const uniqueChars = new Set(word.split(''));
  if (uniqueChars.size / word.length > 0.7) score += 5;

  return Math.min(92, Math.max(70, score));
}

async function enrichWithWikipedia() {
  console.log('\n=== Enriching Word Databases with Wikipedia ===\n');

  for (const language of LANGUAGES) {
    try {
      console.log(`Processing ${language}...`);

      // Load existing curated words
      const filePath = path.join(DATA_DIR, `${language}.json`);
      const existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const existingWords = new Set(existingData.words.map((w: any) => w.word));

      console.log(`  📚 Existing curated words: ${existingWords.size}`);

      // Fetch Wikipedia content (multiple days for variety)
      const wikiWords: Array<{ word: string; source: string; url?: string; score: number }> = [];
      const today = new Date();

      console.log(`  🌐 Fetching Wikipedia words...`);

      // Fetch from multiple recent dates for variety
      for (let daysBack = 0; daysBack < 7; daysBack++) {
        const date = new Date(today);
        date.setDate(date.getDate() - daysBack);

        try {
          const content = await fetchFeaturedContent(language, date);
          if (!content) {
            continue;
          }
          const extracted = extractWordsFromFeaturedContent(content, language);

          for (const candidate of extracted) {
            if (!existingWords.has(candidate.word)) {
              wikiWords.push({
                word: candidate.word,
                source: candidate.source,
                url: candidate.url,
                score: calculateScore(candidate.word, candidate.source, language)
              });
              existingWords.add(candidate.word);
            }
          }
        } catch (error) {
          console.log(`    ⚠️  Day ${daysBack}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`  ✅ Wikipedia words fetched: ${wikiWords.length}`);

      // Merge with existing words
      const mergedWords = [...existingData.words, ...wikiWords];

      // Sort by score descending
      mergedWords.sort((a, b) => b.score - a.score);

      // Update file
      const updatedData = {
        language,
        lastUpdated: new Date().toISOString().split('T')[0],
        words: mergedWords
      };

      fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));

      const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1);
      console.log(`  📊 Total words: ${mergedWords.length}`);
      console.log(`  📁 File size: ${fileSize} KB`);
      console.log(`  ➕ Added: ${wikiWords.length} Wikipedia words\n`);

    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  console.log('='.repeat(70));
  console.log('✅ Enrichment complete!');
  console.log('Word databases now contain both curated themes + trending Wikipedia words.');
  console.log('='.repeat(70) + '\n');
}

// Run enrichment
enrichWithWikipedia().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
