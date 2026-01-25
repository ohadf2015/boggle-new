#!/usr/bin/env node
/**
 * Generate SQL INSERT statements for Wikipedia words
 * Usage: node scripts/generate-wiki-sql.js [language] [batch_number]
 * Example: node scripts/generate-wiki-sql.js en 0
 */

const fs = require('fs');
const path = require('path');

const language = process.argv[2] || 'en';
const batchNum = parseInt(process.argv[3] || '0', 10);
const batchSize = 200;

const dataDir = path.join(__dirname, '..', 'data', 'wikipedia-words');
const filePath = path.join(dataDir, `${language}.json`);

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
const date = data.lastUpdated || '2026-01-20';
const totalBatches = Math.ceil(data.words.length / batchSize);

if (batchNum === -1) {
  // Just show info
  console.log(JSON.stringify({
    language: data.language,
    totalWords: data.words.length,
    totalBatches,
    lastUpdated: date
  }));
  process.exit(0);
}

if (batchNum >= totalBatches) {
  console.error(`Batch ${batchNum} out of range (0-${totalBatches - 1})`);
  process.exit(1);
}

const start = batchNum * batchSize;
const batch = data.words.slice(start, start + batchSize);

const values = batch.map(w => {
  const word = w.word.replace(/'/g, "''");
  const source = w.source.replace(/'/g, "''");
  return `('${data.language}', '${date}', '${word}', '${source}', ${w.score})`;
}).join(',\n');

const sql = `INSERT INTO wikipedia_word_candidates (language, fetch_date, word, source_article_title, interestingness_score)
VALUES
${values}
ON CONFLICT (language, word, fetch_date) DO UPDATE SET
  interestingness_score = EXCLUDED.interestingness_score,
  source_article_title = EXCLUDED.source_article_title,
  validation_status = 'valid';`;

console.log(sql);
