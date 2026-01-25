#!/usr/bin/env npx tsx
/**
 * Sync Wikipedia words from JSON files to Supabase database
 * This script reads the local JSON files and inserts/updates the
 * wikipedia_word_candidates table.
 *
 * Usage: npx tsx scripts/sync-wikipedia-to-db.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
config({ path: path.join(__dirname, '..', '.env') });
config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

interface WikipediaWord {
  word: string;
  source: string;
  url?: string;
  score: number;
}

interface WikipediaWordsFile {
  language: string;
  lastUpdated: string;
  words: WikipediaWord[];
}

const BATCH_SIZE = 200;
const DATA_DIR = path.join(__dirname, '..', 'data', 'wikipedia-words');

async function loadJsonFile(filePath: string): Promise<WikipediaWordsFile | null> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

async function insertBatch(
  language: string,
  fetchDate: string,
  words: WikipediaWord[]
): Promise<number> {
  const records = words.map(w => ({
    language,
    fetch_date: fetchDate,
    word: w.word,
    source_article_title: w.source,
    source_article_url: w.url || null,
    interestingness_score: w.score,
    validation_status: 'valid' // Mark as valid since they're curated
  }));

  const { error, count } = await supabase
    .from('wikipedia_word_candidates')
    .upsert(records, {
      onConflict: 'language,word,fetch_date',
      ignoreDuplicates: false
    });

  if (error) {
    console.error(`  Batch insert error for ${language}:`, error.message);
    return 0;
  }

  return words.length;
}

async function syncLanguage(filePath: string): Promise<number> {
  const data = await loadJsonFile(filePath);
  if (!data || !data.words?.length) {
    console.log(`  No words found in ${filePath}`);
    return 0;
  }

  console.log(`  Processing ${data.words.length} words for ${data.language}...`);

  const fetchDate = data.lastUpdated || new Date().toISOString().split('T')[0];
  let totalInserted = 0;

  // Process in batches
  for (let i = 0; i < data.words.length; i += BATCH_SIZE) {
    const batch = data.words.slice(i, i + BATCH_SIZE);
    const inserted = await insertBatch(data.language, fetchDate, batch);
    totalInserted += inserted;

    // Progress indicator
    const progress = Math.min(i + BATCH_SIZE, data.words.length);
    process.stdout.write(`\r  Inserted ${progress}/${data.words.length} words...`);
  }

  console.log(`\n  ✓ Completed ${data.language}: ${totalInserted} words`);
  return totalInserted;
}

async function main() {
  console.log('=== Wikipedia Words Database Sync ===\n');

  const languages = ['en', 'he', 'sv', 'ja', 'es'];
  let grandTotal = 0;

  for (const lang of languages) {
    const filePath = path.join(DATA_DIR, `${lang}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${lang}: file not found`);
      continue;
    }

    console.log(`\nSyncing ${lang.toUpperCase()}...`);
    const count = await syncLanguage(filePath);
    grandTotal += count;
  }

  console.log(`\n=== Sync Complete ===`);
  console.log(`Total words synced: ${grandTotal}`);

  // Verify the data
  const { data: counts, error } = await supabase
    .from('wikipedia_word_candidates')
    .select('language', { count: 'exact', head: true });

  if (!error) {
    console.log('\nDatabase word counts by language:');
    const { data: langCounts } = await supabase
      .rpc('count_wikipedia_words_by_language');

    if (langCounts) {
      for (const lc of langCounts) {
        console.log(`  ${lc.language}: ${lc.count} words`);
      }
    }
  }
}

main().catch(console.error);
