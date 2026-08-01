#!/usr/bin/env node

/**
 * Fetch frequency word lists from GitHub (hermitdave/FrequencyWords).
 * Deterministic: uses pinned URLs to specific revisions.
 * Stores in scripts/connections/mine/corpora/<locale>.txt (one word per line, rank-ordered).
 */

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPORA_DIR = path.join(__dirname, 'corpora');

// Pinned URLs to specific GitHub revisions for reproducibility
const CORPUS_URLS = {
  en: 'https://raw.githubusercontent.com/hermitdave/Frequency-Words/1f6b75991be7daef404993b3da79151891a4b148/content/2018/en/en_50k.txt',
  sv: 'https://raw.githubusercontent.com/hermitdave/Frequency-Words/1f6b75991be7daef404993b3da79151891a4b148/content/2016/sv/sv_50k.txt',
  ja: 'https://raw.githubusercontent.com/hermitdave/Frequency-Words/1f6b75991be7daef404993b3da79151891a4b148/content/2016/ja/ja_50k.txt',
  es: 'https://raw.githubusercontent.com/hermitdave/Frequency-Words/1f6b75991be7daef404993b3da79151891a4b148/content/2016/es/es_50k.txt',
  ru: 'https://raw.githubusercontent.com/hermitdave/Frequency-Words/1f6b75991be7daef404993b3da79151891a4b148/content/2015/ru/ru_50k.txt',
  he: 'https://raw.githubusercontent.com/hermitdave/Frequency-Words/1f6b75991be7daef404993b3da79151891a4b148/content/2016/he/he_50k.txt',
};

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }
}

async function fetchCorpus(locale) {
  const url = CORPUS_URLS[locale];
  if (!url) {
    console.error(`No corpus URL for locale: ${locale}`);
    return false;
  }

  const outPath = path.join(CORPORA_DIR, `${locale}.txt`);

  try {
    console.log(`Fetching ${locale}...`);
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`HTTP ${response.status} for ${locale}: ${response.statusText}`);
      return false;
    }

    // Stream directly to file
    await pipeline(response.body, createWriteStream(outPath));

    // Verify row count
    const content = await fs.readFile(outPath, 'utf-8');
    const rowCount = content.trim().split('\n').length;
    console.log(`  ✓ Fetched ${locale}: ${rowCount} rows`);

    if (rowCount < 1000) {
      console.warn(`  ⚠ ${locale} has only ${rowCount} rows (expected ~50k)`);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Failed to fetch ${locale}:`, err.message);
    return false;
  }
}

async function main() {
  await ensureDir(CORPORA_DIR);

  const locales = process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : Object.keys(CORPUS_URLS);

  console.log(`Fetching ${locales.length} corpora...`);
  console.log('(Add .gitignore: corpora/ if needed)\n');

  let success = 0;
  for (const locale of locales) {
    if (await fetchCorpus(locale)) {
      success++;
    }
  }

  console.log(`\n${success}/${locales.length} corpora fetched successfully`);
  return success === locales.length ? 0 : 1;
}

process.exit(await main());
