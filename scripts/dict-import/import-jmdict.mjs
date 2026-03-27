#!/usr/bin/env node
/**
 * Import JMdict (Japanese-Multilingual Dictionary) for Boggle word game.
 * Source: http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz
 * License: CC-BY-SA 4.0
 *
 * Extracts kanji (keb) and reading (reb) entries suitable for grid games.
 * Filters for 2-8 character words.
 */

import { createWriteStream } from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { writeFile, readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JMDICT_URL = 'http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz';
const OUTPUT_FILE = resolve(__dirname, '../../fe-next/backend/japanese_words_jmdict.txt');
const EXISTING_FILE = resolve(__dirname, '../../fe-next/backend/kanji_compounds.txt');

const MIN_LENGTH = 2;
const MAX_LENGTH = 8;

// Only allow kanji + hiragana + katakana (no Latin, no symbols)
const japaneseCharPattern = /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]+$/;

async function downloadAndParse() {
  console.log('Downloading JMdict_e.gz...');
  const response = await fetch(JMDICT_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const gunzip = createGunzip();
  const tmpFile = resolve(__dirname, 'jmdict_temp.xml');
  const ws = createWriteStream(tmpFile);

  await pipeline(
    Readable.fromWeb(response.body),
    gunzip,
    ws
  );

  console.log('Downloaded and decompressed. Parsing XML...');

  const xmlContent = await readFile(tmpFile, 'utf-8');

  // Extract <keb> (kanji) and <reb> (reading/kana) elements
  const kebMatches = xmlContent.matchAll(/<keb>([^<]+)<\/keb>/g);
  const rebMatches = xmlContent.matchAll(/<reb>([^<]+)<\/reb>/g);

  const words = new Set();

  for (const match of kebMatches) {
    const word = match[1].trim();
    if (word.length >= MIN_LENGTH && word.length <= MAX_LENGTH && japaneseCharPattern.test(word)) {
      words.add(word);
    }
  }

  for (const match of rebMatches) {
    const word = match[1].trim();
    if (word.length >= MIN_LENGTH && word.length <= MAX_LENGTH && japaneseCharPattern.test(word)) {
      words.add(word);
    }
  }

  // Load existing words
  let existingCount = 0;
  try {
    const existing = await readFile(EXISTING_FILE, 'utf-8');
    const existingWords = existing.split('\n').map(w => w.trim()).filter(w => w.length > 0);
    existingCount = existingWords.length;
    for (const w of existingWords) {
      words.add(w);
    }
  } catch {
    console.log('No existing kanji_compounds.txt found');
  }

  const sorted = Array.from(words).sort();
  await writeFile(OUTPUT_FILE, sorted.join('\n') + '\n', 'utf-8');

  // Clean up temp file
  const { unlink } = await import('fs/promises');
  await unlink(tmpFile).catch(() => {});

  console.log(`\nResults:`);
  console.log(`  Existing words: ${existingCount}`);
  console.log(`  JMdict words (2-8 chars): ${sorted.length - existingCount} new`);
  console.log(`  Total unique words: ${sorted.length}`);
  console.log(`  Written to: ${OUTPUT_FILE}`);
}

downloadAndParse().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
