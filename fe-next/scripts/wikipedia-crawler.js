#!/usr/bin/env node
/**
 * Enhanced Wikipedia Crawler
 * Aggressively fetches words from multiple Wikipedia sources
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data', 'wikipedia-words');
const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

// Wikipedia API fetch with retry
function fetchWikipedia(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };

    const attemptFetch = (attemptsLeft) => {
      https.get(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            if (attemptsLeft > 0) {
              setTimeout(() => attemptFetch(attemptsLeft - 1), 1000);
            } else {
              reject(e);
            }
          }
        });
      }).on('error', (err) => {
        if (attemptsLeft > 0) {
          setTimeout(() => attemptFetch(attemptsLeft - 1), 1000);
        } else {
          reject(err);
        }
      });
    };

    attemptFetch(retries);
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

// Extract words from text content
function extractWordsFromText(text, language, source) {
  const words = [];
  const minLen = language === 'ja' ? 2 : 4;
  const maxLen = language === 'ja' ? 4 : 8;

  // Validation patterns by language
  const patterns = {
    en: /[A-Z][a-z]{3,7}/g,
    he: /[\u0590-\u05FF]{4,8}/g,
    sv: /[A-ZÅÄÖ][a-zåäö]{3,7}/g,
    ja: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]{2,4}/g,
    es: /[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{3,7}/g
  };

  const pattern = patterns[language];
  if (!pattern) return words;

  const matches = text.match(pattern) || [];
  const uniqueWords = new Set();

  for (const match of matches) {
    const word = match.toUpperCase().trim();
    if (word.length >= minLen && word.length <= maxLen && !uniqueWords.has(word)) {
      uniqueWords.add(word);
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

// Calculate interestingness score
function calculateScore(word, source, language) {
  let score = 50;

  // Source bonus
  if (source === 'tfa_title') score += 20;
  else if (source === 'onthisday_title') score += 15;
  else if (source === 'mostread_title') score += 10;
  else if (source === 'random_title') score += 8;
  else if (source === 'tfa_extract') score += 18;
  else if (source === 'random_extract') score += 7;

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

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function crawlLanguage(language) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Crawling ${language.toUpperCase()}...`);
  console.log('='.repeat(70));

  // Load existing words
  const filePath = path.join(DATA_DIR, `${language}.json`);
  const existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const existingWords = new Set(existingData.words.map(w => w.word));

  console.log(`📚 Existing words: ${existingWords.size}`);

  const newWords = [];
  const today = new Date();

  // 1. FEATURED CONTENT (60 days back)
  console.log(`\n🌟 Crawling Featured Content (60 days)...`);
  let featuredCount = 0;
  for (let daysBack = 0; daysBack < 60; daysBack++) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysBack);
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '/');

    try {
      const url = `https://${language}.wikipedia.org/api/rest_v1/feed/featured/${dateStr}`;
      const content = await fetchWikipedia(url);

      // Extract from TFA
      if (content.tfa) {
        const title = content.tfa.titles?.normalized || content.tfa.title || '';
        const extract = content.tfa.extract || '';

        const titleWords = extractWordsFromTitle(title, language, 'tfa_title');
        const extractWords = extractWordsFromText(extract, language, 'tfa_extract');

        for (const word of [...titleWords, ...extractWords]) {
          if (!existingWords.has(word.word)) {
            newWords.push(word);
            existingWords.add(word.word);
            featuredCount++;
          }
        }
      }

      // Extract from mostread
      if (content.mostread && content.mostread.articles) {
        for (const article of content.mostread.articles.slice(0, 15)) {
          const title = article.normalizedtitle || article.title || '';
          const titleWords = extractWordsFromTitle(title, language, 'mostread_title');

          for (const word of titleWords) {
            if (!existingWords.has(word.word)) {
              newWords.push(word);
              existingWords.add(word.word);
              featuredCount++;
            }
          }
        }
      }

      // Extract from onthisday
      if (content.onthisday && Array.isArray(content.onthisday)) {
        for (const event of content.onthisday.slice(0, 10)) {
          if (event.pages) {
            for (const page of event.pages.slice(0, 5)) {
              const title = page.normalizedtitle || page.title || '';
              const titleWords = extractWordsFromTitle(title, language, 'onthisday_title');

              for (const word of titleWords) {
                if (!existingWords.has(word.word)) {
                  newWords.push(word);
                  existingWords.add(word.word);
                  featuredCount++;
                }
              }
            }
          }
        }
      }

      if ((daysBack + 1) % 10 === 0) {
        console.log(`  ✓ Processed ${daysBack + 1}/60 days (${featuredCount} new words so far)`);
      }

      await delay(200);
    } catch (error) {
      // Silently continue on errors
    }
  }
  console.log(`✅ Featured content: +${featuredCount} words`);

  // 2. RANDOM ARTICLES (100 random pages)
  console.log(`\n🎲 Crawling Random Articles (100 pages)...`);
  let randomCount = 0;
  for (let i = 0; i < 100; i++) {
    try {
      const url = `https://${language}.wikipedia.org/api/rest_v1/page/random/summary`;
      const article = await fetchWikipedia(url);

      if (article.title && article.extract) {
        const titleWords = extractWordsFromTitle(article.title, language, 'random_title');
        const extractWords = extractWordsFromText(article.extract, language, 'random_extract');

        for (const word of [...titleWords, ...extractWords]) {
          if (!existingWords.has(word.word)) {
            newWords.push(word);
            existingWords.add(word.word);
            randomCount++;
          }
        }
      }

      if ((i + 1) % 20 === 0) {
        console.log(`  ✓ Processed ${i + 1}/100 pages (${randomCount} new words so far)`);
      }

      await delay(200);
    } catch (error) {
      // Silently continue
    }
  }
  console.log(`✅ Random articles: +${randomCount} words`);

  // Save results
  const totalNew = newWords.length;
  console.log(`\n📊 Summary:`);
  console.log(`  Previous: ${existingData.words.length} words`);
  console.log(`  New: +${totalNew} words`);
  console.log(`  Total: ${existingData.words.length + totalNew} words`);

  if (totalNew > 0) {
    const mergedWords = [...existingData.words, ...newWords];
    mergedWords.sort((a, b) => b.score - a.score);

    const updatedData = {
      language,
      lastUpdated: new Date().toISOString().split('T')[0],
      words: mergedWords
    };

    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
    const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1);
    console.log(`  File size: ${fileSize} KB`);
    console.log(`✅ Saved!`);
  }
}

async function crawlAll() {
  console.log('\n🕷️  WIKIPEDIA CRAWLER - AGGRESSIVE MODE');
  console.log('Fetching from 60 days of featured content + 100 random articles per language');
  console.log('='.repeat(70));

  const startTime = Date.now();

  for (const language of LANGUAGES) {
    try {
      await crawlLanguage(language);
    } catch (error) {
      console.log(`❌ Error crawling ${language}: ${error.message}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ CRAWL COMPLETE! (${elapsed} minutes)`);
  console.log('All language databases enriched with Wikipedia content.');
  console.log('='.repeat(70) + '\n');
}

// Run crawler
crawlAll().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
