#!/usr/bin/env node
/**
 * Enrich word databases with real Wikipedia words
 * Fetches words from Wikipedia API and merges with existing curated words
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data', 'wikipedia-words');
const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

// Wikipedia API fetch helper
function fetchWikipedia(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Helper to extract individual words from title
function extractWordsFromTitle(title, language, source) {
  const words = [];
  const minLen = language === 'ja' ? 2 : 4;
  const maxLen = language === 'ja' ? 4 : 8;

  // Split by spaces, underscores, and convert to uppercase
  const parts = title.replace(/_/g, ' ').split(/\s+/);

  // Validation patterns by language
  const patterns = {
    en: /^[A-Z]+$/,
    he: /^[\u0590-\u05FF]+$/,
    sv: /^[A-ZÅÄÖ]+$/,
    ja: /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/,
    es: /^[A-ZÁÉÍÓÚÑÜ]+$/
  };

  const pattern = patterns[language];
  if (!pattern) return words;

  for (const part of parts) {
    const word = part.toUpperCase().trim();
    if (word.length >= minLen && word.length <= maxLen && pattern.test(word)) {
      words.push({
        word,
        source,
        url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(word)}`,
        score: calculateScore(word, source, language)
      });
    }
  }

  return words;
}

// Extract words from Wikipedia content
function extractWords(content, language) {
  const words = [];
  const minLen = language === 'ja' ? 2 : 4;
  const maxLen = language === 'ja' ? 4 : 8;

  // Regex patterns by language
  const patterns = {
    en: /[A-Z]{4,8}/g,
    he: /[\u0590-\u05FF]{4,8}/g,
    sv: /[A-ZÅÄÖ]{4,8}/g,
    ja: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]{2,4}/g,
    es: /[A-ZÁÉÍÓÚÑÜ]{4,8}/g
  };

  const pattern = patterns[language];
  if (!pattern) return words;

  // Extract from TFA (single object)
  if (content.tfa) {
    const title = content.tfa.titles?.normalized || content.tfa.title || '';
    words.push(...extractWordsFromTitle(title, language, 'tfa_title'));
  }

  // Extract from mostread (articles array)
  if (content.mostread && content.mostread.articles) {
    for (const article of content.mostread.articles.slice(0, 10)) {
      const title = article.normalizedtitle || article.title || '';
      words.push(...extractWordsFromTitle(title, language, 'mostread_title'));
    }
  }

  // Extract from onthisday (array of events)
  if (content.onthisday && Array.isArray(content.onthisday)) {
    for (const event of content.onthisday.slice(0, 5)) {
      if (event.pages) {
        for (const page of event.pages.slice(0, 3)) {
          const title = page.normalizedtitle || page.title || '';
          words.push(...extractWordsFromTitle(title, language, 'onthisday_title'));
        }
      }
    }
  }

  return words;
}

// Calculate interestingness score
function calculateScore(word, source, language) {
  let score = 50;

  // Source bonus
  if (source === 'tfa_title') score += 20;
  else if (source === 'onthisday_title') score += 15;
  else if (source === 'mostread_title') score += 10;

  // Length bonus
  if (language === 'ja') {
    if (word.length >= 3) score += 5;
  } else {
    if (word.length >= 6) score += 5;
    if (word.length >= 7) score += 3;
  }

  // Character variety
  const uniqueChars = new Set(word.split(''));
  if (uniqueChars.size / word.length > 0.7) score += 5;

  return Math.min(92, Math.max(70, score));
}

// Delay helper
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function enrichLanguage(language) {
  console.log(`Processing ${language}...`);

  // Load existing words
  const filePath = path.join(DATA_DIR, `${language}.json`);
  const existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const existingWords = new Set(existingData.words.map(w => w.word));

  console.log(`  📚 Existing curated words: ${existingWords.size}`);

  // Fetch Wikipedia words from multiple days
  const wikiWords = [];
  const today = new Date();

  console.log(`  🌐 Fetching Wikipedia words from last 21 days...`);

  for (let daysBack = 0; daysBack < 21; daysBack++) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysBack);
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '/');

    try {
      const url = `https://${language}.wikipedia.org/api/rest_v1/feed/featured/${dateStr}`;
      const content = await fetchWikipedia(url);
      const extracted = extractWords(content, language);

      for (const candidate of extracted) {
        if (!existingWords.has(candidate.word)) {
          wikiWords.push(candidate);
          existingWords.add(candidate.word);
        }
      }
    } catch (error) {
      console.log(`    ⚠️  Day ${daysBack}: ${error.message}`);
    }

    await delay(300); // Rate limiting
  }

  console.log(`  ✅ Wikipedia words fetched: ${wikiWords.length}`);

  // Merge and save
  const mergedWords = [...existingData.words, ...wikiWords];
  mergedWords.sort((a, b) => b.score - a.score);

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
}

async function enrichAll() {
  console.log('\n=== Enriching Word Databases with Wikipedia ===\n');

  for (const language of LANGUAGES) {
    try {
      await enrichLanguage(language);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }

  console.log('='.repeat(70));
  console.log('✅ Enrichment complete!');
  console.log('Word databases now contain both curated themes + trending Wikipedia words.');
  console.log('='.repeat(70) + '\n');
}

// Run
enrichAll().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
